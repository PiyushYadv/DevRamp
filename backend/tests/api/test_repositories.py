import os
import shutil
import pytest
from app.config import settings
from app.exceptions.github import GitHubRateLimitError
from app.models.user import User
from app.services.github.client import GitHubRepo
from app.services.ingestion import service as ingestion_service
from app.services.github import repositories as github_repositories
from app.services.repository.clone import RepositoryCloner
from app.utils.encryption import encrypt_secret

FIXTURE_FILES = {
    "README.md": "# Demo\n",
    "src/auth/jwt.py": "import jwt\n\ndef create_access_token(user_id):\n    return jwt.encode({'sub': user_id})\n",
    "src/app.ts": "export class App {\n  run(): void {}\n}\n",
    "assets/logo.png": b"\x89PNG\r\n\x00\x00binary",
    "node_modules/pkg/index.js": "function vendored() {}\n",
}


def github_repo(full_name="octo/demo", private=False, size_kb=10) -> GitHubRepo:
    owner, name = full_name.split("/")
    return GitHubRepo(id="1001", owner=owner, name=name, full_name=full_name, html_url=f"https://github.com/{full_name}",
                      private=private, default_branch="main", language="Python", stars=7,
                      pushed_at="2026-09-25T10:00:00Z", size_kb=size_kb, description="Demo repo")


class World:
    """Controls the fake GitHub API and records clone/index calls."""

    def __init__(self):
        self.repos: dict[str, GitHubRepo] = {"octo/demo": github_repo()}
        self.private_visible_to_token = False
        self.rate_limited = False
        self.clones: list[tuple[str, str, str | None]] = []
        self.upserts: dict[str, list[dict]] = {}
        self.embed_error: Exception | None = None
        self.user_repos: list[GitHubRepo] = []


@pytest.fixture
def world(monkeypatch, tmp_path):
    w = World()
    monkeypatch.setattr(settings, "REPOS_DIR", str(tmp_path / "repos"))

    class FakeGitHub:
        def __init__(self, token=None):
            self.token = token

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            pass

        def get_repository(self, owner, name):
            if w.rate_limited:
                raise GitHubRateLimitError()
            # GitHub resolves owner/name case-insensitively
            repo = {k.lower(): v for k, v in w.repos.items()}.get(f"{owner}/{name}".lower())
            if repo and repo.private and not (self.token and w.private_visible_to_token):
                return None  # GitHub hides private repos with a 404
            return repo

        def list_repositories(self):
            return w.user_repos

    def fake_clone(self, url, repo_id, access_token=None):
        w.clones.append((url, repo_id, access_token))
        if "missing" in url:
            raise ValueError("Failed to clone repository. Check the URL and that the repository is public.")
        root = os.path.join(self.base_dir, repo_id)
        shutil.rmtree(root, ignore_errors=True)  # the real cloner replaces any previous copy
        for rel, content in FIXTURE_FILES.items():
            path = os.path.join(root, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb" if isinstance(content, bytes) else "w") as f:
                f.write(content)
        os.symlink("/etc/hosts", os.path.join(root, "src", "evil_link.py"))
        os.makedirs(os.path.join(root, ".git"), exist_ok=True)
        with open(os.path.join(root, ".git", "config"), "w") as f:
            f.write("[core]\n")
        return root

    class FakeEmbedder:
        async def embed_documents(self, texts, on_progress=None):
            if w.embed_error:
                raise w.embed_error
            if on_progress:
                await on_progress(len(texts), len(texts))
            return [[0.1] * 768 for _ in texts]

    class FakeStore:
        async def replace_namespace(self, repo_id, vectors):
            w.upserts[repo_id] = vectors

    monkeypatch.setattr(ingestion_service, "GitHubClient", FakeGitHub)
    monkeypatch.setattr(github_repositories, "GitHubClient", FakeGitHub)
    monkeypatch.setattr(RepositoryCloner, "clone_repo", fake_clone)
    monkeypatch.setattr(RepositoryCloner, "get_repo_metadata", lambda self, path: {"commit_sha": "abc1234", "default_branch": "main"})
    monkeypatch.setattr(ingestion_service, "get_embedder", FakeEmbedder)
    monkeypatch.setattr(ingestion_service, "get_vector_store", FakeStore)
    return w


def auth_headers(client, email="dev@example.com"):
    token = client.post("/api/auth/signup", json={"name": "Dev", "email": email, "password": "password123"}).json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def ingest(client, headers, url="https://github.com/octo/demo"):
    return client.post("/api/ingest", json={"repoUrl": url}, headers=headers)


def test_ingest_clones_parses_and_indexes_in_background(client, world):
    headers = auth_headers(client)
    res = ingest(client, headers)

    assert res.status_code == 200
    body = res.json()
    repo_id = body["repoId"]
    assert body["status"] == "processing"  # returned before background indexing
    assert body["repository"]["fullName"] == "octo/demo"
    assert body["repository"]["private"] is False
    assert body["repository"]["currentCommit"] == "abc1234"

    # TestClient runs background tasks before returning, so indexing has finished
    status = client.get(f"/api/repository/{repo_id}/ingestion", headers=headers).json()
    assert status == {"status": "completed", "stage": "completed", "progress": 100,
                      "message": "Indexed 3 code chunks", "chunkCount": 3}

    vectors = world.upserts[repo_id]
    meta = {v["metadata"]["symbol"]: v["metadata"] for v in vectors}
    assert meta["create_access_token"]["path"] == "src/auth/jwt.py"
    assert meta["create_access_token"]["startLine"] == 3
    assert meta["create_access_token"]["repoId"] == repo_id
    assert "evil_link.py" not in str(vectors) and "vendored" not in str(vectors)

    repo = client.get(f"/api/repository/{repo_id}", headers=headers).json()
    assert repo["indexedFiles"] == 2 and repo["chunkCount"] == 3


def test_tree_and_legacy_tree_route(client, world):
    headers = auth_headers(client)
    repo_id = ingest(client, headers).json()["repoId"]

    tree = client.get(f"/api/repository/{repo_id}/tree", headers=headers).json()
    assert client.get(f"/api/tree?repo_id={repo_id}", headers=headers).json() == tree

    names = [n["name"] for n in tree]
    assert names == ["assets", "src", "README.md"]  # folders first, hidden + node_modules excluded
    src = next(n for n in tree if n["name"] == "src")
    auth = next(n for n in src["children"] if n["name"] == "auth")
    assert auth["children"] == [{"name": "jwt.py", "path": "src/auth/jwt.py", "type": "file", "indexed": True}]
    assert not any(c["name"] == "evil_link.py" for c in src["children"])
    readme = next(n for n in tree if n["name"] == "README.md")
    assert readme["indexed"] is False


def test_file_endpoint_and_path_safety(client, world):
    headers = auth_headers(client)
    repo_id = ingest(client, headers).json()["repoId"]
    url = f"/api/repository/{repo_id}/file"

    res = client.get(url, params={"path": "src/auth/jwt.py"}, headers=headers)
    assert res.status_code == 200
    assert res.json() == {"path": "src/auth/jwt.py", "lang": "Python", "content": FIXTURE_FILES["src/auth/jwt.py"],
                          "startLine": 1, "endLine": 4}

    for bad in ("../../../etc/hosts", "src/../../x", ".git/config", "src/evil_link.py", "/etc/hosts", "nope.py"):
        res = client.get(url, params={"path": bad}, headers=headers)
        assert res.status_code == 404, bad
        assert res.json()["code"] == "FILE_NOT_FOUND"

    assert client.get(url, params={"path": "assets/logo.png"}, headers=headers).status_code == 415


def test_repositories_are_isolated_per_user(client, world):
    alice = auth_headers(client, "alice@example.com")
    bob = auth_headers(client, "bob@example.com")
    repo_id = ingest(client, alice).json()["repoId"]

    assert [r["id"] for r in client.get("/api/repositories", headers=alice).json()] == [repo_id]
    assert client.get("/api/repositories", headers=bob).json() == []
    for path in (f"/api/repository/{repo_id}/tree", f"/api/repository/{repo_id}/ingestion",
                 f"/api/repository/{repo_id}", f"/api/tree?repo_id={repo_id}"):
        res = client.get(path, headers=bob)
        assert res.status_code == 404, path
        assert res.json()["code"] == "REPOSITORY_NOT_FOUND"


def test_second_user_reuses_indexed_repository(client, world):
    first = ingest(client, auth_headers(client, "a@example.com")).json()
    bob = auth_headers(client, "b@example.com")
    second = ingest(client, bob, "https://github.com/OCTO/demo.git").json()

    assert second["repoId"] == first["repoId"]
    assert second["status"] == "completed"
    assert len(world.clones) == 1
    assert client.get(f"/api/repository/{second['repoId']}/tree", headers=bob).status_code == 200


@pytest.mark.parametrize("url", ["not a url", "https://gitlab.com/a/b", "https://github.com/onlyowner", "github.com/a/b/../c"])
def test_invalid_repository_urls(client, world, url):
    res = ingest(client, auth_headers(client), url)

    assert res.status_code == 400
    assert res.json()["code"] == "INVALID_REPOSITORY_URL"


def test_missing_or_private_repository_without_github(client, world):
    world.repos["octo/secret"] = github_repo("octo/secret", private=True)
    headers = auth_headers(client)

    for url in ("https://github.com/octo/nope", "https://github.com/octo/secret"):
        res = ingest(client, headers, url)
        assert res.status_code == 404
        assert "connect GitHub" in res.json()["detail"]
    assert world.clones == []


def test_private_repository_with_github_token_clones_with_token(client, world, db_session):
    world.repos["octo/secret"] = github_repo("octo/secret", private=True)
    world.private_visible_to_token = True
    headers = auth_headers(client)
    user = db_session.query(User).one()
    user.github_access_token = encrypt_secret("gho_secret")
    db_session.commit()

    body = ingest(client, headers, "https://github.com/octo/secret").json()

    assert body["repository"]["private"] is True
    assert world.clones[0][2] == "gho_secret"
    # Another DevRamp user without GitHub access to it can't join the private workspace
    res = ingest(client, auth_headers(client, "other@example.com"), "https://github.com/octo/secret")
    assert res.status_code == 404


def test_oversized_repository_rejected(client, world):
    world.repos["octo/demo"] = github_repo(size_kb=10_000_000)
    res = ingest(client, auth_headers(client))

    assert res.status_code == 413
    assert world.clones == []


def test_clone_failure_marks_repository_failed(client, world):
    world.rate_limited = True  # metadata lookup unavailable -> anonymous clone attempt
    headers = auth_headers(client)
    res = ingest(client, headers, "https://github.com/octo/missing")

    assert res.status_code == 403
    assert res.json()["code"] == "REPOSITORY_NOT_PUBLIC"
    repo = client.get("/api/repositories", headers=headers).json()[0]
    assert repo["analysisStatus"] == "failed"


def test_embedding_failure_marks_failed_then_reingest_recovers(client, world):
    world.embed_error = RuntimeError("boom")
    headers = auth_headers(client)
    repo_id = ingest(client, headers).json()["repoId"]

    status = client.get(f"/api/repository/{repo_id}/ingestion", headers=headers).json()
    assert status["status"] == "failed"
    assert status["message"] == "Indexing failed. Please try again."  # internal error text not leaked

    world.embed_error = None
    assert ingest(client, headers).json()["repoId"] == repo_id
    assert client.get(f"/api/repository/{repo_id}/ingestion", headers=headers).json()["status"] == "completed"


def test_ingest_requires_auth(client, world):
    assert client.post("/api/ingest", json={"repoUrl": "https://github.com/octo/demo"}).status_code == 401


def test_github_repositories_require_connection(client, world):
    headers = auth_headers(client)

    res = client.get("/api/github/repositories", headers=headers)
    assert res.status_code == 400
    assert res.json()["code"] == "GITHUB_NOT_CONNECTED"


def test_github_repositories_list_and_access_selection(client, world, db_session):
    headers = auth_headers(client)
    user = db_session.query(User).one()
    user.github_access_token = encrypt_secret("gho_x")
    db_session.commit()
    world.user_repos = [github_repo("octo/demo"), github_repo("octo/other")]
    world.user_repos[1].id = "1002"
    repo_id = ingest(client, headers).json()["repoId"]

    saved = client.post("/api/github/repositories/access", json={"repositoryIds": ["1002", "1002"]}, headers=headers)
    assert saved.json() == {"repositoryIds": ["1002"]}

    listing = {r["fullName"]: r for r in client.get("/api/github/repositories", headers=headers).json()}
    assert listing["octo/demo"]["indexed"] is True and listing["octo/demo"]["repoId"] == repo_id
    assert listing["octo/demo"]["selected"] is False
    assert listing["octo/other"]["selected"] is True and listing["octo/other"]["repoId"] is None
