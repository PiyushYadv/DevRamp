import os
from app.services.ingestion.chunker import IGNORED_DIRS

MAX_SCANNED_FILES = 10_000  # guard against pathological repositories
MAX_READ_BYTES = 512 * 1024


class RepoSnapshot:
    """One walk over a cloned repository; every analyzer reads files through it."""

    def __init__(self, root: str):
        self.root = os.path.realpath(root)
        self.files: list[str] = self._walk()  # repo-relative, '/'-separated
        self._file_set = set(self.files)

    def _walk(self) -> list[str]:
        found = []
        for current, dirs, files in os.walk(self.root):
            dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS and not d.startswith("."))
            for name in sorted(files):
                full = os.path.join(current, name)
                # Untrusted repos can symlink to files outside the clone
                if os.path.islink(full):
                    continue
                found.append(os.path.relpath(full, self.root).replace("\\", "/"))
                if len(found) >= MAX_SCANNED_FILES:
                    return found
        return found

    def exists(self, rel_path: str) -> bool:
        return rel_path in self._file_set

    def read(self, rel_path: str) -> str | None:
        """Text content of a scanned file, or None for missing, oversized or binary files."""
        if rel_path not in self._file_set:
            return None
        full = os.path.join(self.root, rel_path)
        try:
            if os.path.getsize(full) > MAX_READ_BYTES:
                return None
            with open(full, "rb") as f:
                raw = f.read()
        except OSError:
            return None
        if b"\x00" in raw[:8192]:
            return None
        return raw.decode("utf-8", errors="replace")

    def find(self, *names: str, max_depth: int = 2) -> list[str]:
        """Files with one of these basenames at most `max_depth` directories deep, shallowest first."""
        wanted = set(names)
        matches = [p for p in self.files if p.rsplit("/", 1)[-1] in wanted and p.count("/") <= max_depth]
        return sorted(matches, key=lambda p: (p.count("/"), p))


def parent_dir(rel_path: str) -> str:
    return rel_path.rsplit("/", 1)[0] if "/" in rel_path else ""


def join(directory: str, name: str) -> str:
    return f"{directory}/{name}" if directory else name
