from app.parsers.tree_sitter import get_parser_and_lang
from app.services.ingestion.chunker import ASTChunker


def chunk(code: str, ext: str):
    parser, lang = get_parser_and_lang(ext)
    return ASTChunker().chunk_source(code.encode("utf-8"), parser, lang, "repo_test", f"src/file{ext}", "abc123")


def by_symbol(chunks):
    return {c.symbol: c for c in chunks}


def test_python_functions_classes_and_methods():
    code = (
        "import os\n"
        "\n"
        "@decorator\n"
        "async def fetch(url):\n"
        "    return url\n"
        "\n"
        "class Service:\n"
        "    def run(self):\n"
        "        return 1\n"
    )
    chunks = by_symbol(chunk(code, ".py"))

    assert chunks["fetch"].node_type == "function_definition"
    assert chunks["fetch"].start_line == 3  # decorator line included
    assert chunks["fetch"].end_line == 5
    assert chunks["Service"].node_type == "class_definition"
    assert chunks["Service.run"].node_type == "method_definition"
    assert chunks["Service.run"].start_line == 8


def test_typescript_declarations():
    code = (
        "export interface User { id: string }\n"
        "type Id = string;\n"
        "enum Role { Admin }\n"
        "export class AuthService {\n"
        "  login(user: User): Id { return user.id; }\n"
        "}\n"
        "export const validate = (u: User) => Boolean(u.id);\n"
    )
    chunks = by_symbol(chunk(code, ".ts"))

    assert chunks["User"].node_type == "interface_declaration"
    assert chunks["Id"].node_type == "type_alias_declaration"
    assert chunks["Role"].node_type == "enum_declaration"
    assert chunks["AuthService"].node_type == "class_declaration"
    assert chunks["AuthService.login"].node_type == "method_definition"
    assert chunks["validate"].content.startswith("export const validate")


def test_tsx_arrow_component():
    code = (
        "import React from 'react';\n"
        "export const Button = ({ label }: { label: string }) => {\n"
        "  return <button>{label}</button>;\n"
        "};\n"
    )
    chunks = by_symbol(chunk(code, ".tsx"))

    assert chunks["Button"].start_line == 2
    assert chunks["Button"].end_line == 4


def test_javascript_function_and_class():
    code = "function add(a, b) { return a + b; }\nclass Cart { total() { return 0; } }\n"
    chunks = by_symbol(chunk(code, ".jsx"))

    assert set(chunks) == {"add", "Cart", "Cart.total"}


def test_nested_callbacks_are_not_separate_chunks():
    code = "function outer() {\n  const inner = () => 1;\n  return [1].map((x) => x);\n}\n"
    chunks = chunk(code, ".js")

    assert [c.symbol for c in chunks] == ["outer"]


def test_non_ascii_content_is_sliced_correctly():
    code = "# héllo wörld ✓\ndef greet():\n    return 'こんにちは'\n"
    (greet,) = chunk(code, ".py")

    assert greet.content == "def greet():\n    return 'こんにちは'"


def test_script_without_definitions_becomes_module_chunk():
    (module,) = chunk("print('hello')\n", ".py")

    assert module.node_type == "module"
    assert module.symbol is None
    assert module.start_line == 1


def test_extract_chunks_skips_ignored_dirs(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("def main():\n    pass\n")
    (tmp_path / "node_modules" / "pkg").mkdir(parents=True)
    (tmp_path / "node_modules" / "pkg" / "index.js").write_text("function vendored() {}\n")
    (tmp_path / ".github").mkdir()
    (tmp_path / ".github" / "script.js").write_text("function ci() {}\n")

    chunks = ASTChunker().extract_chunks(str(tmp_path), "repo_test", "abc123")

    assert [(c.path, c.symbol) for c in chunks] == [("src/app.py", "main")]


def test_oversized_function_is_split_on_statement_boundaries():
    body = "".join(f"    x{i} = {i}\n" for i in range(400))
    code = f"def huge():\n{body}    return x0\n"
    parts = chunk(code, ".py")

    assert len(parts) == 3
    assert all(p.symbol == "huge" for p in parts)
    assert [(p.part, p.parts) for p in parts] == [(1, 3), (2, 3), (3, 3)]
    assert parts[0].start_line == 1 and parts[0].content.startswith("def huge():")
    assert parts[-1].end_line == 402
    # contiguous, non-overlapping coverage
    assert all(a.end_line + 1 == b.start_line for a, b in zip(parts, parts[1:]))
    assert all(p.end_line - p.start_line + 1 <= 150 for p in parts)


def test_large_class_gets_summary_chunk_plus_methods():
    methods = "".join(f"    def m{i}(self):\n" + "".join(f"        a = {j}\n" for j in range(20)) for i in range(10))
    code = f'class Big:\n    """Docs."""\n    limit = 5\n\n{methods}'
    chunks = by_symbol(chunk(code, ".py"))

    summary = chunks["Big"]
    assert summary.start_line == 1 and summary.end_line == 214
    assert '"""Docs."""' in summary.content and "def m9(self):" in summary.content
    assert "a = 19" not in summary.content  # method bodies are not repeated
    assert "Big.m9" in chunks


def test_symlinked_files_are_not_indexed(tmp_path):
    secret = tmp_path.parent / f"{tmp_path.name}_outside.py"
    secret.write_text("def leaked():\n    pass\n")
    (tmp_path / "link.py").symlink_to(secret)
    (tmp_path / "real.py").write_text("def ok():\n    pass\n")

    chunks = ASTChunker().extract_chunks(str(tmp_path), "repo_test", "abc123")

    assert [c.symbol for c in chunks] == ["ok"]
