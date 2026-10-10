import posixpath
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from app.services.analysis.scan import RepoSnapshot, parent_dir
from app.services.analysis.stack import StackProfile

PY_EXTS = (".py",)
JS_EXTS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
JS_RESOLVE_SUFFIXES = ("", *JS_EXTS, *(f"/index{ext}" for ext in JS_EXTS))
# Wrapper folders that group code rather than name a module: features/billing -> "billing"
CONTAINER_DIRS = {"src", "app", "lib", "features", "modules", "packages", "apps", "services", "domains", "libs", "pkg"}
TEST_DIRS = {"test", "tests", "__tests__", "spec", "e2e", "__mocks__", "migrations", "alembic"}
MAX_GROUPS = 12
GROUP_COLORS = [
    "border-indigo-500/30 bg-indigo-500/5", "border-emerald-500/30 bg-emerald-500/5",
    "border-orange-500/30 bg-orange-500/5", "border-cyan-500/30 bg-cyan-500/5",
    "border-pink-500/30 bg-pink-500/5", "border-violet-500/30 bg-violet-500/5",
    "border-amber-500/30 bg-amber-500/5", "border-sky-500/30 bg-sky-500/5",
    "border-slate-500/30 bg-slate-500/5",
]

PY_FROM = re.compile(r"^\s*from\s+(\.*[\w.]*)\s+import\s+([\w*, ()]+)", re.MULTILINE)
PY_IMPORT = re.compile(r"^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)", re.MULTILINE)
JS_IMPORT = re.compile(
    r"""(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(?\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)"""
)
PY_SYMBOL = re.compile(r"^(?:class|def|async def)\s+([A-Za-z]\w*)", re.MULTILINE)
JS_SYMBOL = re.compile(
    r"^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|interface|type|enum)\s+([A-Za-z_$][\w$]*)", re.MULTILINE
)


@dataclass
class CodeGroup:
    key: str  # repo-relative directory (or file for single-file modules)
    name: str
    files: list[str]
    deps: list[str]  # keys of groups this one imports
    symbols: list[str]


def _is_test_file(path: str) -> bool:
    name = path.rsplit("/", 1)[-1]
    return (
        any(part in TEST_DIRS for part in path.split("/")[:-1])
        or name.startswith("test_") or name.endswith(("_test.py", "conftest.py"))
        or re.search(r"\.(test|spec|stories)\.[jt]sx?$", name) is not None
    )


def _group_key(path: str, component_root: str) -> str:
    """The directory that names this file's module: first non-container folder under the component root."""
    rel = path[len(component_root) + 1:] if component_root else path
    parts = rel.split("/")[:-1]
    taken = []
    for part in parts:
        taken.append(part)
        if part not in CONTAINER_DIRS:
            break
    if not taken:
        # File directly in the component root: the component itself is the module
        return component_root or path.rsplit(".", 1)[0]
    return "/".join(filter(None, [component_root, *taken]))


class _Resolver:
    def __init__(self, sources: list[str], python_roots: list[str], component_roots: list[str]):
        self.files = set(sources)
        self.component_roots = component_roots
        # Dotted module name -> file, for every root a Python package could be imported from
        self.py_modules: dict[str, str] = {}
        for root in python_roots:
            prefix = f"{root}/" if root else ""
            for path in sources:
                if path.endswith(PY_EXTS) and path.startswith(prefix):
                    dotted = path[len(prefix):-3].replace("/", ".").removesuffix(".__init__")
                    self.py_modules.setdefault(dotted, path)

    def _py_file(self, base: str) -> str | None:
        return next((base + s for s in (".py", "/__init__.py") if base + s in self.files), None)

    def python(self, path: str, module: str, names: list[str]) -> list[str]:
        if module.startswith("."):
            dots = len(module) - len(module.lstrip("."))
            parts = path.split("/")[:-1]
            parts = parts[: len(parts) - (dots - 1)]
            tail = module.lstrip(".")
            base = "/".join(parts + (tail.split(".") if tail else []))
            # `from . import views` imports submodules; `from .models import User` imports the module itself
            hits = [h for n in names if (h := self._py_file(f"{base}/{n}" if base else n))]
            return hits or [h for h in [self._py_file(base)] if h]
        for target in [f"{module}.{n}" for n in names] + [module]:
            parts = target.split(".")
            while parts:
                if (hit := self.py_modules.get(".".join(parts))) is not None:
                    return [hit]
                parts.pop()
        return []

    def javascript(self, path: str, spec: str) -> str | None:
        if spec.startswith("."):
            base = posixpath.normpath(posixpath.join(parent_dir(path), spec))
            bases = [base]
        elif spec.startswith(("@/", "~/")):
            bases = [f"{root}/src/{spec[2:]}" if root else f"src/{spec[2:]}" for root in self.component_roots]
        else:
            return None  # third-party package
        for base in bases:
            for suffix in JS_RESOLVE_SUFFIXES:
                if base + suffix in self.files:
                    return base + suffix
        return None


def build_code_groups(snapshot: RepoSnapshot, profile: StackProfile) -> list[CodeGroup]:
    roots = sorted({c.path for c in profile.components} | {""}, key=len, reverse=True)
    sources = [
        p for p in snapshot.files
        if p.endswith(PY_EXTS + JS_EXTS) and not p.endswith((".d.ts", ".min.js")) and not _is_test_file(p)
    ]

    def component_root(path: str) -> str:
        return next(r for r in roots if not r or path.startswith(r + "/"))

    group_of = {p: _group_key(p, component_root(p)) for p in sources}
    python_roots = sorted(set(roots) | {f"{r}/src" if r else "src" for r in roots})
    resolver = _Resolver(sources, python_roots, roots)

    edges: dict[str, Counter] = defaultdict(Counter)
    symbols: dict[str, list[str]] = defaultdict(list)
    for path in sources:
        text = snapshot.read(path)
        if text is None:
            continue
        source_group = group_of[path]
        targets: list[str] = []
        if path.endswith(PY_EXTS):
            for module, names in PY_FROM.findall(text):
                imported = [n.strip() for n in names.replace("(", "").replace(")", "").split(",") if n.strip() not in ("", "*")]
                targets += resolver.python(path, module, imported)
            for modules in PY_IMPORT.findall(text):
                for module in modules.split(","):
                    targets += resolver.python(path, module.strip(), [])
            symbols[source_group] += PY_SYMBOL.findall(text)
        else:
            for match in JS_IMPORT.findall(text):
                spec = next(s for s in match if s)
                if (target := resolver.javascript(path, spec)) is not None:
                    targets.append(target)
            symbols[source_group] += JS_SYMBOL.findall(text)
        for target in targets:
            if (target_group := group_of.get(target)) and target_group != source_group:
                edges[source_group][target_group] += 1

    files_by_group: dict[str, list[str]] = defaultdict(list)
    for path, group in group_of.items():
        files_by_group[group].append(path)
    # Keep the largest, most connected modules
    in_degree = Counter(t for deps in edges.values() for t in deps)
    ranked = sorted(files_by_group, key=lambda g: (-(len(files_by_group[g]) + 2 * in_degree[g]), g))[:MAX_GROUPS]
    kept = set(ranked)
    names = _display_names(ranked)
    return [
        CodeGroup(
            key=g,
            name=names[g],
            files=sorted(files_by_group[g]),
            deps=[t for t, _ in edges[g].most_common() if t in kept],
            symbols=list(dict.fromkeys(symbols[g]))[:8],
        )
        for g in ranked
    ]


def _display_names(keys: list[str]) -> dict[str, str]:
    """Shortest unique trailing path for each group: 'auth', or 'backend/auth' when two share a name."""
    depth = {k: 1 for k in keys}
    while True:
        names = {k: "/".join(k.split("/")[-depth[k]:]) for k in keys}
        counts = Counter(names.values())
        clashing = [k for k in keys if counts[names[k]] > 1 and depth[k] < k.count("/") + 1]
        if not clashing:
            return names
        for k in clashing:
            depth[k] += 1


def dependency_modules(groups: list[CodeGroup]) -> list[dict]:
    names = {g.key: g.name for g in groups}
    return [
        {"name": g.name, "deps": [names[d] for d in g.deps], "color": GROUP_COLORS[i % len(GROUP_COLORS)]}
        for i, g in enumerate(groups)
    ]
