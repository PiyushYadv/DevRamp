import os
from app.services.ingestion.chunker import IGNORED_DIRS

MAX_TREE_ENTRIES = 20_000  # guard against pathological repositories


def build_file_tree(repo_path: str, indexed_paths: set[str] | None = None) -> list[dict]:
    """Hierarchical FileTreeNode dicts: folders first, then files, alphabetical; paths repo-relative with '/'."""
    indexed_paths = indexed_paths or set()
    budget = [MAX_TREE_ENTRIES]

    def walk_dir(current_path: str) -> list[dict]:
        try:
            entries = sorted(os.scandir(current_path), key=lambda e: e.name.lower())
        except OSError:
            return []

        folders, files = [], []
        for entry in entries:
            if budget[0] <= 0:
                break
            if entry.name.startswith(".") or entry.name in IGNORED_DIRS:
                continue
            rel_path = os.path.relpath(entry.path, repo_path).replace("\\", "/")
            # follow_symlinks=False: never walk into symlinked directories that may point outside the clone
            if entry.is_dir(follow_symlinks=False):
                budget[0] -= 1
                folders.append({"name": entry.name, "path": rel_path, "type": "folder", "children": walk_dir(entry.path)})
            elif entry.is_file(follow_symlinks=False):
                budget[0] -= 1
                files.append({"name": entry.name, "path": rel_path, "type": "file", "indexed": rel_path in indexed_paths})
        return folders + files

    return walk_dir(repo_path)
