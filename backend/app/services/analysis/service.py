import threading
from collections import OrderedDict
from app.models.repository import Repository
from app.services.analysis import architecture as arch
from app.services.analysis import setup
from app.services.analysis.dependencies import build_code_groups, dependency_modules
from app.services.analysis.modules import build_checklist, build_modules
from app.services.analysis.scan import RepoSnapshot
from app.services.analysis.stack import detect_stack
from app.services.repository.service import RepositoryFileService

CACHE_SIZE = 32


class AnalysisService:
    """Static analysis of a persisted clone; results are cached per (repository, commit)."""

    _cache: "OrderedDict[tuple[str, str | None], dict]" = OrderedDict()
    _lock = threading.Lock()

    def __init__(self, files: RepositoryFileService | None = None):
        self.files = files or RepositoryFileService()

    def analyze(self, repo: Repository) -> dict:
        root = self.files.root(repo)  # raises RepositoryNotReadyError before the clone exists
        key = (repo.id, repo.current_commit)
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]

        result = self._compute(repo, root)
        with self._lock:
            self._cache[key] = result
            while len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return result

    @classmethod
    def clear_cache(cls) -> None:
        with cls._lock:
            cls._cache.clear()

    def _compute(self, repo: Repository, root: str) -> dict:
        snapshot = RepoSnapshot(root)
        profile = detect_stack(snapshot)
        nodes, edges = arch.build_graph(profile, repo)
        groups = build_code_groups(snapshot, profile)
        analysis = {
            "repo_name": repo.name,
            "groups": groups,
            "test_command": setup.suite_command(snapshot, profile),
            "flow": arch.describe_flow(nodes, edges),
            "architecture": {
                "tags": arch.tags(profile),
                "summary": arch.summary(profile, repo),
                "connections": arch.connections(edges, nodes),
                "quickStart": setup.quick_start(snapshot, profile, repo),
                "nodes": nodes,
                "mermaid": arch.to_mermaid(nodes, edges),
            },
            "setup": {
                "environmentVariables": setup.environment_variables(snapshot, profile),
                "prerequisites": setup.prerequisites(profile),
            },
            "dependencies": dependency_modules(groups),
        }
        analysis["modules"] = build_modules(analysis)
        analysis["checklist"] = build_checklist(analysis)
        return analysis

    def architecture(self, repo: Repository) -> dict:
        return self.analyze(repo)["architecture"]

    def setup(self, repo: Repository) -> dict:
        return self.analyze(repo)["setup"]

    def dependencies(self, repo: Repository) -> list[dict]:
        return self.analyze(repo)["dependencies"]

    def modules(self, repo: Repository) -> list[dict]:
        return self.analyze(repo)["modules"]

    def checklist(self, repo: Repository) -> dict[int, list[dict]]:
        return self.analyze(repo)["checklist"]
