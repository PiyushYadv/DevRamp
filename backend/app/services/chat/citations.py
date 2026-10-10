import re
from collections.abc import Callable

# [file:src/auth/jwt.py:L42] or [file:src/auth/jwt.py:L42-L50]. Models sometimes drop the "L"
# ([file:src/auth/jwt.py:42-50]), so both are accepted.
CITATION_PATTERN = re.compile(r"\[file:([^\]\s]+?):L?(\d+)(?:-L?(\d+))?\]")


class CitationExtractor:
    """
    Incrementally finds citation tokens in streamed model text. Tokens can be split across deltas, so the
    accumulated text is rescanned and each citation is emitted once. Paths are checked with `is_valid_path`
    so hallucinated files never become clickable citations.
    """

    def __init__(self, is_valid_path: Callable[[str], bool]):
        self.is_valid_path = is_valid_path
        self.text = ""
        self._seen: set[str] = set()
        self._scan_from = 0
        self.citations: list[dict] = []

    def feed(self, delta: str) -> list[dict]:
        self.text += delta
        new = []
        last_end = self._scan_from
        for match in CITATION_PATTERN.finditer(self.text, self._scan_from):
            last_end = match.end()
            citation = self._to_citation(match)
            if citation and citation["label"] not in self._seen:
                self._seen.add(citation["label"])
                self.citations.append(citation)
                new.append(citation)
        # Keep rescanning only from the last complete token or a possibly unfinished "[" near the end
        open_bracket = self.text.rfind("[", last_end)
        self._scan_from = open_bracket if open_bracket != -1 else len(self.text)
        return new

    def _to_citation(self, match: re.Match) -> dict | None:
        path = match.group(1).strip("/")
        line = int(match.group(2))
        end_line = int(match.group(3)) if match.group(3) else None
        if line < 1 or not self.is_valid_path(path):
            return None
        if end_line is not None and end_line <= line:
            end_line = None
        label = f"{path}:L{line}" + (f"-L{end_line}" if end_line else "")
        citation = {"file": path, "line": line, "label": label}
        if end_line:
            citation["endLine"] = end_line
        return citation
