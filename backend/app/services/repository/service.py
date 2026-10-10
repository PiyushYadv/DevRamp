import os
from app.exceptions.repository import (
    FileNotFoundInRepositoryError, FileNotTextError, FileTooLargeError, RepositoryNotReadyError,
)
from app.models.repository import Repository
from app.services.ingestion.language import detect_language
from app.services.repository.clone import RepositoryCloner
from app.services.repository.tree import build_file_tree

MAX_VIEWABLE_BYTES = 1024 * 1024


class RepositoryFileService:
    """Read-only access to a repository's persisted clone."""

    def __init__(self, cloner: RepositoryCloner | None = None):
        self.cloner = cloner or RepositoryCloner()

    def root(self, repo: Repository) -> str:
        root = self.cloner.repo_path(repo.id)
        if not os.path.isdir(root):
            raise RepositoryNotReadyError()
        return os.path.realpath(root)

    def tree(self, repo: Repository) -> list[dict]:
        return build_file_tree(self.root(repo), set(repo.indexed_paths or []))

    def resolve(self, repo: Repository, path: str) -> tuple[str, str] | None:
        """(normalized repo-relative path, absolute path) for a regular file inside the clone, else None."""
        root = self.root(repo)
        rel_path = path.replace("\\", "/").strip("/")
        if not rel_path or any(part in ("", ".", "..", ".git") for part in rel_path.split("/")):
            return None
        # realpath resolves symlinks too, so a link pointing outside the clone is rejected here
        full_path = os.path.realpath(os.path.join(root, rel_path))
        if os.path.commonpath([root, full_path]) != root or not os.path.isfile(full_path):
            return None
        return rel_path, full_path

    def read_file(self, repo: Repository, path: str) -> dict:
        resolved = self.resolve(repo, path)
        if resolved is None:
            raise FileNotFoundInRepositoryError()
        rel_path, full_path = resolved
        if os.path.getsize(full_path) > MAX_VIEWABLE_BYTES:
            raise FileTooLargeError()

        with open(full_path, "rb") as f:
            raw = f.read()
        if b"\x00" in raw[:8192]:
            raise FileNotTextError()

        content = raw.decode("utf-8", errors="replace")
        return {
            "path": rel_path,
            "lang": detect_language(rel_path),
            "content": content,
            "start_line": 1,
            "end_line": max(1, content.count("\n") + (0 if content.endswith("\n") else 1)),
        }
