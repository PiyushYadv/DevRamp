import shutil
import pytest
from app.services.analysis.service import AnalysisService
from app.services.repository.clone import RepositoryCloner
from tests.api.test_repositories import auth_headers, ingest, world  # noqa: F401  (fixture)

ENDPOINTS = ("architecture", "dependencies", "setup", "modules", "checklist")


@pytest.fixture(autouse=True)
def fresh_cache():
    AnalysisService.clear_cache()
    yield
    AnalysisService.clear_cache()


def test_analysis_endpoints_return_frontend_contract(client, world):
    headers = auth_headers(client)
    repo_id = ingest(client, headers).json()["repoId"]

    arch = client.get(f"/api/repository/{repo_id}/architecture", headers=headers).json()
    assert set(arch) == {"tags", "summary", "connections", "quickStart", "nodes", "mermaid"}
    assert arch["mermaid"].startswith("flowchart TD")
    assert arch["quickStart"][0] == {"command": "git clone https://github.com/octo/demo.git", "comment": "clone"}
    assert {"id", "label", "sub", "kind", "color", "bg"} <= set(arch["nodes"][0])

    setup = client.get(f"/api/repository/{repo_id}/setup", headers=headers).json()
    assert set(setup) == {"environmentVariables", "prerequisites"}

    modules = client.get(f"/api/repository/{repo_id}/modules", headers=headers).json()
    assert [m["n"] for m in modules] == [1, 2, 3]
    assert {"accentBg", "accentBorder", "sections"} <= set(modules[0])

    checklist = client.get(f"/api/repository/{repo_id}/checklist", headers=headers).json()
    assert set(checklist) == {"1", "2", "3"}
    assert checklist["1"][0] == {"id": "a1", "label": "Read the architecture summary", "done": False}

    deps = client.get(f"/api/repository/{repo_id}/dependencies", headers=headers).json()
    assert all(set(d) == {"name", "deps", "color"} for d in deps)


def test_analysis_requires_access(client, world):
    repo_id = ingest(client, auth_headers(client, "alice@example.com")).json()["repoId"]
    stranger = auth_headers(client, "bob@example.com")
    for endpoint in ENDPOINTS:
        assert client.get(f"/api/repository/{repo_id}/{endpoint}", headers=stranger).status_code == 404
        assert client.get(f"/api/repository/{repo_id}/{endpoint}").status_code == 401


def test_analysis_before_clone_exists(client, world):
    headers = auth_headers(client)
    repo_id = ingest(client, headers).json()["repoId"]
    shutil.rmtree(RepositoryCloner().repo_path(repo_id))
    res = client.get(f"/api/repository/{repo_id}/architecture", headers=headers)
    assert res.status_code == 409
