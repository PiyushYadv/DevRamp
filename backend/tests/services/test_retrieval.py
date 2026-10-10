import os
from types import SimpleNamespace
import pytest
from app.services.chat.retrieval import MAX_CONTEXT_CHUNKS, RAGRetriever
from app.services.repository.clone import RepositoryCloner
from app.services.repository.service import RepositoryFileService


def hit(id_, path, score, start=1, end=10, symbol="fn"):
    return {"id": id_, "score": score, "metadata": {
        "path": path, "startLine": start, "endLine": end, "content": f"code {id_}", "symbol": symbol}}


class FakeEmbedder:
    async def embed_query(self, text):
        return [0.0] * 768


class FakeStore:
    def __init__(self, repo_hits, file_hits=(), package_hits=()):
        self.repo_hits, self.file_hits, self.package_hits = list(repo_hits), list(file_hits), list(package_hits)
        self.filters = []

    async def query(self, repo_id, vector, top_k=8, metadata_filter=None):
        self.filters.append(metadata_filter)
        if metadata_filter is None:
            return self.repo_hits[:top_k]
        if "path" in metadata_filter:
            return self.file_hits[:top_k]
        return self.package_hits[:top_k]


@pytest.fixture
def repo(tmp_path):
    cloner = RepositoryCloner(str(tmp_path))
    root = os.path.join(cloner.base_dir, "repo_1")
    os.makedirs(os.path.join(root, "src/auth"))
    with open(os.path.join(root, "src/auth/jwt.py"), "w") as f:
        f.write("".join(f"line {i}\n" for i in range(1, 301)))
    with open(os.path.join(root, "README.md"), "w") as f:
        f.write("# Demo\nHello\n")
    return SimpleNamespace(id="repo_1"), RepositoryFileService(cloner)


async def test_repo_wide_only_without_open_file(repo):
    snapshot, files = repo
    store = FakeStore([hit("a", "src/x.py", 0.9), hit("b", "src/y.py", 0.8)])

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q")

    assert store.filters == [None]
    assert [c.path for c in chunks] == ["src/x.py", "src/y.py"]
    assert {c.relevance for c in chunks} == {"repository"}


async def test_open_file_and_package_are_boosted_not_exclusive(repo):
    snapshot, files = repo
    store = FakeStore(
        repo_hits=[hit("other", "lib/other.py", 0.70)],
        file_hits=[hit("f1", "src/auth/jwt.py", 0.65)],
        package_hits=[hit("p1", "src/auth/session.py", 0.67)],
    )

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q", "src/auth/jwt.py")

    assert store.filters[1] == {"path": {"$eq": "src/auth/jwt.py"}}
    assert store.filters[2] == {"$and": [{"directory": {"$eq": "src/auth"}}, {"path": {"$ne": "src/auth/jwt.py"}}]}
    # 0.65+0.08 > 0.67+0.04 > 0.70: boosts reorder, repository-wide results are still included
    assert [(c.path, c.relevance) for c in chunks] == [
        ("src/auth/jwt.py", "current file"), ("src/auth/session.py", "same package"), ("lib/other.py", "repository"),
    ]


async def test_open_file_guaranteed_even_when_outranked(repo):
    snapshot, files = repo
    strong = [hit(f"r{i}", f"lib/m{i}.py", 0.99 - i * 0.01) for i in range(12)]
    store = FakeStore(repo_hits=strong, file_hits=[hit("f1", "src/auth/jwt.py", 0.2), hit("f2", "src/auth/jwt.py", 0.1, 20, 30)])

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q", "src/auth/jwt.py")

    assert len(chunks) == MAX_CONTEXT_CHUNKS
    assert sum(c.relevance == "current file" for c in chunks) == 2


async def test_selected_lines_are_pinned_first_from_disk(repo):
    snapshot, files = repo
    store = FakeStore([hit("a", "src/x.py", 0.9)], file_hits=[hit("f", "src/auth/jwt.py", 0.5)])

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q", "src/auth/jwt.py", 20, 22)

    assert chunks[0].relevance == "selected"
    assert (chunks[0].start_line, chunks[0].end_line) == (20, 22)
    assert chunks[0].content == "line 20\nline 21\nline 22"


async def test_unindexed_open_file_contributes_its_head(repo):
    snapshot, files = repo
    store = FakeStore([hit("a", "src/x.py", 0.9)])

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q", "README.md")

    assert chunks[0].path == "README.md" and chunks[0].content == "# Demo\nHello"


async def test_traversal_in_file_context_is_ignored(repo):
    snapshot, files = repo
    store = FakeStore([hit("a", "src/x.py", 0.9)])

    chunks = await RAGRetriever(FakeEmbedder(), store, files).retrieve(snapshot, "q", "../../etc/hosts", 1, 5)

    assert store.filters == [None]
    assert [c.path for c in chunks] == ["src/x.py"]
