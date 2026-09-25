import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

# Initialize language grammars
PY_LANGUAGE = Language(tspython.language())
JS_LANGUAGE = Language(tsjavascript.language())
TS_LANGUAGE = Language(tstypescript.language(), "typescript")

def get_parser_and_lang(extension: str) -> tuple[Parser, str] | tuple[None, None]:
    """Returns the configured Parser and the string name of the language."""
    parser = Parser()
    if extension == ".py":
        parser.language = PY_LANGUAGE
        return parser, "python"
    elif extension in [".js", ".jsx"]:
        parser.language = JS_LANGUAGE
        return parser, "javascript"
    elif extension in [".ts", ".tsx"]:
        parser.language = TS_LANGUAGE
        return parser, "typescript"
    return None, None