import json
import os
from types import SimpleNamespace
import pytest
from app.services.analysis.service import AnalysisService

FULLSTACK_REPO = {
    "docker-compose.yml": "services:\n  db:\n    image: postgres:16-alpine\n  cache:\n    image: bitnami/redis:7\n",
    "web/package.json": json.dumps({
        "dependencies": {"react": "^18", "react-dom": "^18"},
        "devDependencies": {"vite": "^5", "typescript": "^5"},
        "scripts": {"dev": "vite", "build": "vite build", "test": "vitest"},
        "engines": {"node": ">=20"},
    }),
    "web/pnpm-lock.yaml": "",
    "web/.env.example": "VITE_API_URL=http://localhost:8000\n",
    "web/src/main.tsx": "import { App } from './app/App';\n",
    "web/src/app/App.tsx": "import { Chart } from '@/features/billing/Chart';\nexport function App() {}\n",
    "web/src/features/billing/Chart.tsx": "export const Chart = () => null;\n",
    "api/requirements.txt": "fastapi==0.110\nSQLAlchemy>=2  # orm\npsycopg2-binary\nstripe\nPyJWT\ncelery[redis]\n-r dev.txt\n",
    "api/alembic.ini": "[alembic]\n",
    "api/.env.example": (
        "# required\nDATABASE_URL=postgresql://<user>:<password>@localhost:5432/app\n"
        "STRIPE_SECRET_KEY=sk_live_REALSECRET\n# optional\nLOG_LEVEL=info\nPORT=8000\n"
    ),
    "api/app/__init__.py": "",
    "api/app/main.py": "from fastapi import FastAPI\nfrom app.routes import billing\n\napp = FastAPI()\n",
    "api/app/routes/__init__.py": "",
    "api/app/routes/billing.py": "from ..services.billing import charge\nfrom app.models import Invoice\n\ndef create(): ...\n",
    "api/app/services/__init__.py": "",
    "api/app/services/billing.py": "from app.models import Invoice\n\nclass BillingService:\n    pass\n\ndef charge(): ...\n",
    "api/app/models.py": "class Invoice: ...\n",
    "api/tests/test_billing.py": "from app.services.billing import charge\n",
    "docs/requirements.txt": "mkdocs\n",
}


def write_repo(root, files: dict[str, str]):
    for rel, content in files.items():
        path = os.path.join(root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(content)


@pytest.fixture(autouse=True)
def fresh_cache():
    AnalysisService.clear_cache()
    yield
    AnalysisService.clear_cache()


def public(result: dict) -> str:
    """Everything the API can return, as text."""
    return json.dumps({k: v for k, v in result.items() if k != "groups"}, ensure_ascii=False)


def analyze(root, name="shop", description=None):
    files = SimpleNamespace(root=lambda repo: str(root))
    repo = SimpleNamespace(id=f"repo_{name}", current_commit="abc", name=name,
                           url=f"https://github.com/octo/{name}", description=description, language="Python")
    return AnalysisService(files).analyze(repo)


@pytest.fixture
def fullstack(tmp_path):
    write_repo(tmp_path, FULLSTACK_REPO)
    return analyze(tmp_path, description="Billing platform")


def test_detects_stack_from_manifests_compose_and_env(fullstack):
    arch = fullstack["architecture"]
    assert arch["tags"][:3] == ["React", "Vite", "FastAPI"]
    for label in ("PostgreSQL", "Redis", "SQLAlchemy", "JWT", "Stripe", "Celery"):
        assert label in arch["tags"] or label in arch["summary"]
    assert arch["summary"].startswith("Billing platform. Full-stack application with a React / Vite frontend in `web/`")
    assert "Persistent data lives in PostgreSQL accessed through SQLAlchemy." in arch["summary"]
    assert "mkdocs" not in public(fullstack)  # docs/ manifests are not app components


def test_mermaid_flowchart_describes_request_path(fullstack):
    mermaid = fullstack["architecture"]["mermaid"]
    assert mermaid.startswith("flowchart TD\n")
    assert '  web0["web<br/><small>React / Vite</small>"]' in mermaid
    assert '  db0[("PostgreSQL<br/><small>Primary DB</small>")]' in mermaid
    assert "  client -->|HTTPS| web0" in mermaid
    assert "  web0 -->|HTTP/REST| api0" in mermaid
    assert "  api0 -->|SQLAlchemy| db0" in mermaid
    assert "  api0 -->|TCP/6379| db1" in mermaid
    assert '  mq0[/"Celery<br/><small>Task queue</small>"/]' in mermaid and "api0 -->|enqueue jobs| mq0" in mermaid
    assert "classDef database" in mermaid
    connections = fullstack["architecture"]["connections"]
    assert "→ HTTP/REST" in connections and "→ TCP/6379 (Redis)" in connections


def test_quick_start_orders_services_env_backend_then_frontend(fullstack):
    commands = [s["command"] for s in fullstack["architecture"]["quickStart"]]
    assert commands == [
        "git clone https://github.com/octo/shop.git",
        "cd shop",
        "docker compose up -d",
        "cd api && cp .env.example .env",
        "cd web && cp .env.example .env",
        "cd api && python -m venv venv && source venv/bin/activate",
        "cd api && pip install -r requirements.txt",
        "cd api && alembic upgrade head",
        "cd api && uvicorn app.main:app --reload",
        "cd web && pnpm install",
        "cd web && pnpm run dev",
    ]


def test_setup_env_vars_hide_real_secrets_and_respect_hints(fullstack):
    env = {v["key"]: v for v in fullstack["setup"]["environmentVariables"]}
    assert env["DATABASE_URL"]["required"] is True
    assert env["STRIPE_SECRET_KEY"]["value"] == "<stripe_secret_key>"  # concrete secret never echoed
    assert "REALSECRET" not in public(fullstack)
    assert env["LOG_LEVEL"]["required"] is False and env["PORT"]["value"] == "8000"
    prereqs = {p["name"]: p for p in fullstack["setup"]["prerequisites"]}
    assert prereqs["Node.js"]["version"] == ">=20"
    assert prereqs["pnpm"]["available"] and prereqs["PostgreSQL"]["available"]
    assert prereqs["Docker"] == {"name": "Docker", "version": "recommended", "available": False}


def test_dependency_graph_follows_python_and_ts_imports(fullstack):
    graph = {m["name"]: m["deps"] for m in fullstack["dependencies"]}
    # api/app/models.py sits directly in the app package, so it belongs to the api/app group
    assert set(graph["routes"]) == {"services", "api/app"}
    assert graph["services"] == ["api/app"]
    assert graph["src/app"] == ["billing"]  # web/src/app imports the @/ alias into features/billing
    assert not any("tests" in name for name in graph)


def test_modules_and_checklist(fullstack):
    modules = fullstack["modules"]
    assert [m["n"] for m in modules] == [1, 2, 3]
    assert modules[0]["sections"][2]["body"].startswith("Requests travel Client → web (HTTPS) → api (HTTP/REST).")
    tour = {s["heading"]: s["body"] for s in modules[2]["sections"]}
    assert "`BillingService`" in tour["services"] and "Used by routes" in tour["services"]
    checklist = fullstack["checklist"]
    assert set(checklist) == {1, 2, 3}
    labels = [i["label"] for i in checklist[2]]
    assert labels[:3] == ["Clone the repository", "Start supporting services with Docker Compose", "Configure .env from the example file"]
    assert labels[-1] == "Run the test suite (pytest)"
    assert all(not item["done"] for items in checklist.values() for item in items)


def test_repository_without_manifests_still_renders(tmp_path):
    write_repo(tmp_path, {"tool.py": "import os\nTOKEN = os.environ['API_TOKEN']\n\ndef main(): ...\n"})
    result = analyze(tmp_path, name="tool")
    arch = result["architecture"]
    assert arch["mermaid"].splitlines()[1] == '  lib0["tool<br/><small>Python</small>"]'
    assert arch["connections"] == []
    assert result["setup"]["environmentVariables"] == [{"key": "API_TOKEN", "value": "<api_token>", "required": True}]
    assert result["modules"][0]["sections"][2]["body"] == "This repository is a single unit with no external services detected."


def test_symlinks_outside_clone_are_ignored(tmp_path):
    outside = tmp_path / "outside"
    write_repo(outside, {"package.json": json.dumps({"dependencies": {"express": "4"}})})
    repo = tmp_path / "repo"
    write_repo(repo, {"main.py": "print('hi')\n"})
    os.symlink(outside / "package.json", repo / "package.json")
    assert "Express" not in analyze(repo)["architecture"]["tags"]


def test_results_are_cached_per_commit(tmp_path):
    write_repo(tmp_path, {"main.py": ""})
    first = analyze(tmp_path)
    write_repo(tmp_path, {"requirements.txt": "flask\n"})
    assert analyze(tmp_path) is first


def test_plain_html_site_is_detected_as_static_frontend(tmp_path):
    write_repo(tmp_path, {
        "index.html": "<script src='script.js'></script>",
        "style.css": "body {}",
        "script.js": "const open = function () {};\nbtn.addEventListener('click', open);\n",
    })
    result = analyze(tmp_path, name="landing")
    arch = result["architecture"]
    assert arch["tags"] == ["Static site", "HTML", "CSS", "JavaScript"]
    assert arch["summary"].startswith("Static website written in plain HTML, CSS and JavaScript")
    assert "  client -->|HTTPS| web0" in arch["mermaid"]
    assert '  web0["Web App<br/><small>Static site</small>"]' in arch["mermaid"]
    assert arch["quickStart"][-1] == {"command": "npx serve .", "comment": "serve"}
    assert result["setup"]["prerequisites"][0]["name"] == "Modern browser"
