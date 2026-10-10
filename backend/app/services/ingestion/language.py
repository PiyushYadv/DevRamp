import os
from collections import Counter

# Display names used by the code viewer (`lang`) and repository cards (`language`)
_LANGUAGES = {
    ".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
    ".mjs": "JavaScript", ".cjs": "JavaScript", ".json": "JSON", ".md": "Markdown", ".yml": "YAML",
    ".yaml": "YAML", ".toml": "TOML", ".html": "HTML", ".css": "CSS", ".scss": "SCSS", ".sql": "SQL",
    ".sh": "Shell", ".go": "Go", ".rs": "Rust", ".java": "Java", ".rb": "Ruby", ".php": "PHP",
    ".c": "C", ".h": "C", ".cpp": "C++", ".cs": "C#", ".kt": "Kotlin", ".swift": "Swift",
}
_SPECIAL_FILES = {"Dockerfile": "Dockerfile", "Makefile": "Makefile"}


def detect_language(path: str) -> str:
    name = os.path.basename(path)
    if name in _SPECIAL_FILES:
        return _SPECIAL_FILES[name]
    return _LANGUAGES.get(os.path.splitext(name)[1].lower(), "text")


def primary_language(paths: list[str]) -> str | None:
    """Most common programming language among the given files (data/doc formats ignored)."""
    ignored = {"text", "JSON", "Markdown", "YAML", "TOML"}
    counts = Counter(lang for lang in map(detect_language, paths) if lang not in ignored)
    return counts.most_common(1)[0][0] if counts else None
