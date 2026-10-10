import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

# Initialize language grammars (TSX needs its own grammar to parse JSX syntax)
PY_LANGUAGE = Language(tspython.language())
JS_LANGUAGE = Language(tsjavascript.language())
TS_LANGUAGE = Language(tstypescript.language_typescript())
TSX_LANGUAGE = Language(tstypescript.language_tsx())

# extension -> (grammar, language name used for chunk metadata)
_EXTENSION_MAP: dict[str, tuple[Language, str]] = {
    ".py": (PY_LANGUAGE, "python"),
    ".js": (JS_LANGUAGE, "javascript"),
    ".jsx": (JS_LANGUAGE, "javascript"),
    ".mjs": (JS_LANGUAGE, "javascript"),
    ".cjs": (JS_LANGUAGE, "javascript"),
    ".ts": (TS_LANGUAGE, "typescript"),
    ".tsx": (TSX_LANGUAGE, "typescript"),
}

SUPPORTED_EXTENSIONS = frozenset(_EXTENSION_MAP)


def get_parser_and_lang(extension: str) -> tuple[Parser, str] | tuple[None, None]:
    """Returns a Parser configured for the extension and the string name of the language."""
    entry = _EXTENSION_MAP.get(extension.lower())
    if entry is None:
        return None, None
    language, lang_name = entry
    return Parser(language), lang_name
