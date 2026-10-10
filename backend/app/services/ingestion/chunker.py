import os
from tree_sitter import Node
from app.parsers.tree_sitter import get_parser_and_lang
from app.schemas.ingestion import SemanticChunk

# Directories that never contain first-party source worth indexing
IGNORED_DIRS = {
    ".git", "node_modules", "venv", ".venv", "env", "__pycache__", "dist", "build",
    ".next", ".nuxt", "coverage", "vendor", "site-packages", ".mypy_cache", ".pytest_cache",
}
MAX_FILE_BYTES = 512 * 1024  # skip generated / vendored blobs
MAX_CHUNK_LINES = 150  # larger definitions are split along statement boundaries
# Build output that ships next to sources (Parcel/webpack bundles, minified vendor files, type stubs)
GENERATED_SUFFIXES = (".min.js", ".d.ts", ".bundle.js", ".chunk.js", ".min.mjs")
MINIFIED_LINE_LENGTH = 1000
MINIFIED_AVERAGE_LINE_LENGTH = 200
MINIFIED_MIN_BYTES = 20_000  # small hand-written files can still be one long line (e.g. dense JSX)
TRIVIAL_TOP_LEVEL_TYPES = {"import_statement", "import_from_statement", "future_import_statement", "comment", "hash_bang_line"}


class ASTChunker:
    # Self-contained definitions extracted as a single chunk; we don't descend into them
    LEAF_NODE_TYPES = {
        "python": {"function_definition"},
        "javascript": {"function_declaration", "generator_function_declaration", "method_definition"},
        "typescript": {
            "function_declaration", "generator_function_declaration", "method_definition",
            "interface_declaration", "type_alias_declaration", "enum_declaration",
        },
    }
    # Containers extracted as a summary chunk *and* descended into so their methods are indexed too
    CONTAINER_NODE_TYPES = {
        "python": {"class_definition"},
        "javascript": {"class_declaration"},
        "typescript": {"class_declaration", "abstract_class_declaration"},
    }
    # `const Foo = () => {...}` / `const foo = function () {...}`: how React components are usually written
    FUNCTION_VALUE_TYPES = {"arrow_function", "function_expression", "function"}

    def extract_chunks(self, repo_path: str, repo_id: str, commit_sha: str) -> list[SemanticChunk]:
        chunks = []
        for root, dirs, files in os.walk(repo_path):
            # Prune in place so os.walk never enters ignored or hidden directories
            dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS and not d.startswith("."))

            for file in sorted(files):
                if file.endswith(GENERATED_SUFFIXES) or f"{file}.map" in files:
                    continue
                parser, lang_name = get_parser_and_lang(os.path.splitext(file)[1])
                if not parser:
                    continue  # Skip unsupported files

                file_path = os.path.join(root, file)
                # Untrusted repos can symlink to files outside the clone (e.g. /etc/passwd)
                if os.path.islink(file_path) or os.path.getsize(file_path) > MAX_FILE_BYTES:
                    continue

                rel_path = os.path.relpath(file_path, repo_path).replace("\\", "/")
                with open(file_path, "rb") as f:
                    source = f.read()
                if _looks_generated(source):
                    continue

                chunks.extend(self.chunk_source(source, parser, lang_name, repo_id, rel_path, commit_sha))

        return chunks

    def chunk_source(
        self, source: bytes, parser, lang_name: str,
        repo_id: str, rel_path: str, commit_sha: str,
    ) -> list[SemanticChunk]:
        tree = parser.parse(source)
        ctx = _FileContext(source, lang_name, repo_id, rel_path, commit_sha)
        chunks = self._traverse_and_extract(tree.root_node, ctx, parent_symbol=None)
        # Top-level statements outside any definition (event wiring, app setup, route registration, scripts)
        chunks.extend(self._module_code_chunks(tree.root_node, ctx, chunks))
        return sorted(chunks, key=lambda c: (c.start_line, c.end_line))

    def _module_code_chunks(self, root: Node, ctx: "_FileContext", extracted: list[SemanticChunk]) -> list[SemanticChunk]:
        """Group consecutive top-level statements that no extracted definition covers into module chunks."""
        covered_lines = {line for c in extracted for line in range(c.start_line, c.end_line + 1)}

        def is_covered(node: Node) -> bool:
            lines = range(node.start_point.row + 1, node.end_point.row + 2)
            return sum(line in covered_lines for line in lines) * 2 >= len(lines)

        runs: list[list[Node]] = [[]]
        for statement in root.named_children:
            if is_covered(statement):
                runs.append([])
                continue
            run = runs[-1]
            if run and statement.end_point.row - run[0].start_point.row + 1 > MAX_CHUNK_LINES:
                runs.append(run := [])
            run.append(statement)

        return [
            ctx.make_chunk(run[0], run[-1], "module", None)
            for run in runs
            # Import blocks and stray comments add noise without explaining behaviour
            if not all(_is_trivial_statement(n) for n in run)
        ]

    def _traverse_and_extract(self, node: Node, ctx: "_FileContext", parent_symbol: str | None) -> list[SemanticChunk]:
        leaf_types = self.LEAF_NODE_TYPES[ctx.lang_name]
        container_types = self.CONTAINER_NODE_TYPES[ctx.lang_name]

        # Python decorators live on a wrapper node; keep them in the chunk but classify by the inner definition
        span_node, def_node = node, node
        if node.type == "decorated_definition":
            def_node = node.child_by_field_name("definition") or node

        if def_node.type in leaf_types:
            name = self._symbol_name(def_node, ctx.source)
            symbol = f"{parent_symbol}.{name}" if parent_symbol and name else name
            node_type = def_node.type
            if node_type == "function_definition" and parent_symbol:
                node_type = "method_definition"  # Python methods are plain function_definitions inside a class
            return self._split_definition(span_node, def_node, ctx, node_type, symbol)

        if def_node.type in container_types:
            name = self._symbol_name(def_node, ctx.source)
            symbol = f"{parent_symbol}.{name}" if parent_symbol and name else name
            chunks = [self._class_summary(span_node, def_node, ctx, symbol)]
            body = def_node.child_by_field_name("body")
            if body is not None:
                for child in body.children:
                    chunks.extend(self._traverse_and_extract(child, ctx, parent_symbol=symbol))
            return chunks

        # `const Foo = () => ...` -> chunk the whole declaration so the name stays in the content
        if node.type in ("lexical_declaration", "variable_declaration"):
            chunks = []
            for declarator in node.named_children:
                value = declarator.child_by_field_name("value")
                if declarator.type == "variable_declarator" and value is not None and value.type in self.FUNCTION_VALUE_TYPES:
                    span = node.parent if node.parent is not None and node.parent.type == "export_statement" else node
                    chunks.extend(self._split_definition(
                        span, value, ctx, "function_declaration", self._symbol_name(declarator, ctx.source),
                    ))
            if chunks:
                return chunks

        # Otherwise, keep digging down the tree
        chunks = []
        for child in node.children:
            chunks.extend(self._traverse_and_extract(child, ctx, parent_symbol))
        return chunks

    def _split_definition(
        self, span_node: Node, def_node: Node, ctx: "_FileContext", node_type: str, symbol: str | None,
    ) -> list[SemanticChunk]:
        """One chunk per definition; oversized ones are split between top-level body statements."""
        if _line_count(span_node) <= MAX_CHUNK_LINES:
            return [ctx.make_chunk(span_node, span_node, node_type, symbol)]

        body = def_node if def_node.type in ("module", "program") else def_node.child_by_field_name("body")
        statements = body.named_children if body is not None else []
        if len(statements) < 2:
            return [ctx.make_chunk(span_node, span_node, node_type, symbol)]

        # Greedily group consecutive statements; the first group also carries the signature/decorators
        groups: list[tuple[Node, Node]] = []
        group_start, group_end = span_node, None
        for statement in statements:
            if group_end is not None and statement.end_point.row - group_start.start_point.row + 1 > MAX_CHUNK_LINES:
                groups.append((group_start, group_end))
                group_start = statement
            group_end = statement
        groups.append((group_start, span_node))  # last group runs to the definition's closing line

        return [
            ctx.make_chunk(start, end, node_type, symbol, part=i, parts=len(groups))
            for i, (start, end) in enumerate(groups, start=1)
        ]

    def _class_summary(self, span_node: Node, def_node: Node, ctx: "_FileContext", symbol: str | None) -> SemanticChunk:
        """Class header, docstring and fields plus method signatures; method bodies are indexed separately."""
        body = def_node.child_by_field_name("body")
        members = body.named_children if body is not None else []
        method_types = self.LEAF_NODE_TYPES[ctx.lang_name] | {"decorated_definition"}
        methods = [m for m in members if m.type in method_types]
        if not methods or _line_count(span_node) <= MAX_CHUNK_LINES:
            return ctx.make_chunk(span_node, span_node, def_node.type, symbol)

        header = ctx.text(span_node.start_byte, methods[0].start_byte).rstrip()
        header_lines = header.splitlines()[:MAX_CHUNK_LINES]
        signatures = [ctx.text(m.start_byte, m.end_byte).splitlines()[0].strip() for m in methods]
        content = "\n".join(header_lines + ["    # methods:"] + [f"    {sig}" for sig in signatures])
        return ctx.make_chunk(span_node, span_node, def_node.type, symbol, content=content)

    @staticmethod
    def _symbol_name(node: Node, source: bytes) -> str | None:
        name_node = node.child_by_field_name("name")
        if name_node is None:
            return None
        return source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")


def _looks_generated(source: bytes) -> bool:
    """Bundler/minifier output: source-map trailer or minified line lengths. It would swamp retrieval."""
    if b"sourceMappingURL=" in source[-1024:]:
        return True
    if len(source) < MINIFIED_MIN_BYTES:
        return False
    lines = source.splitlines() or [b""]
    longest = max(len(line) for line in lines)
    return longest > MINIFIED_LINE_LENGTH and len(source) / len(lines) > MINIFIED_AVERAGE_LINE_LENGTH


def _is_trivial_statement(node: Node) -> bool:
    if node.type in TRIVIAL_TOP_LEVEL_TYPES:
        return True
    # Module docstrings and directives such as "use strict"
    return node.type == "expression_statement" and node.named_child_count == 1 and node.named_children[0].type == "string"


def _line_count(node: Node) -> int:
    return node.end_point.row - node.start_point.row + 1


class _FileContext:
    """Per-file values threaded through the traversal."""

    def __init__(self, source: bytes, lang_name: str, repo_id: str, rel_path: str, commit_sha: str):
        self.source = source
        self.lang_name = lang_name
        self.repo_id = repo_id
        self.rel_path = rel_path
        self.commit_sha = commit_sha

    def text(self, start_byte: int, end_byte: int) -> str:
        # Tree-sitter offsets are byte offsets: slice bytes, then decode
        return self.source[start_byte:end_byte].decode("utf-8", errors="replace")

    def make_chunk(
        self, start: Node, end: Node, node_type: str, symbol: str | None,
        content: str | None = None, part: int | None = None, parts: int | None = None,
    ) -> SemanticChunk:
        return SemanticChunk(
            repo_id=self.repo_id,
            path=self.rel_path,
            language=self.lang_name,
            node_type=node_type,
            symbol=symbol,
            start_line=start.start_point.row + 1,  # Tree-sitter rows are 0-indexed
            end_line=end.end_point.row + 1,
            content=content if content is not None else self.text(start.start_byte, end.end_byte),
            commit_sha=self.commit_sha,
            part=part,
            parts=parts,
        )
