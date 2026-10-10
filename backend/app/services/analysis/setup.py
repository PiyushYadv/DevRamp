import re
from app.models.repository import Repository
from app.services.analysis.scan import RepoSnapshot, join
from app.services.analysis.stack import Component, StackProfile

SECRET_KEY_PATTERN = re.compile(r"SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API_KEY|_KEY$|CREDENTIAL", re.IGNORECASE)
PLACEHOLDER_PATTERN = re.compile(r"^$|<.*>|your|change.?me|xxx|\.\.\.|todo|replace|example", re.IGNORECASE)
# Fallback when a repository ships no .env.example: variables the code reads directly
CODE_ENV_PATTERNS = [
    (re.compile(r"""os\.environ\[\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\]"""), True),
    (re.compile(r"""os\.(?:getenv|environ\.get)\(\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\)"""), True),
    (re.compile(r"""os\.(?:getenv|environ\.get)\(\s*['"]([A-Z][A-Z0-9_]+)['"]\s*,"""), False),
    (re.compile(r"""process\.env\.([A-Z][A-Z0-9_]+)"""), True),
    (re.compile(r"""import\.meta\.env\.([A-Z][A-Z0-9_]+)"""), False),
]
IGNORED_CODE_ENV = {"NODE_ENV", "DEV", "PROD", "MODE", "BASE_URL", "SSR", "CI", "HOME", "PATH"}
MAX_ENV_VARS = 40
DATABASE_PREREQS = {"PostgreSQL": "≥ 14", "MySQL": "≥ 8.0", "MongoDB": "≥ 6.0", "Redis": "≥ 7.0", "Elasticsearch": "≥ 8.0"}
BROKER_PREREQS = {"RabbitMQ": "≥ 3.12", "Kafka": "≥ 3.0"}
DEV_SCRIPT_PREFERENCE = ("dev", "start:dev", "develop", "serve", "start")


def _parse_env_file(text: str) -> list[dict]:
    variables, hint = [], ""
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#"):
            hint = line.lower()
            continue
        match = re.match(r"(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", line)
        if not match:
            hint = ""
            continue
        key, value = match.group(1), match.group(2).split(" #", 1)[0].strip().strip("'\"")
        placeholder = PLACEHOLDER_PATTERN.search(value) is not None
        if "optional" in hint:
            required = False
        elif "required" in hint:
            required = True
        else:
            required = placeholder
        # Example files sometimes carry real credentials; never surface a concrete secret value
        if SECRET_KEY_PATTERN.search(key) and not placeholder:
            value = f"<{key.lower()}>"
        variables.append({"key": key, "value": value or f"<{key.lower()}>", "required": required})
        hint = ""
    return variables


def environment_variables(snapshot: RepoSnapshot, profile: StackProfile) -> list[dict]:
    found: dict[str, dict] = {}
    for path in profile.env_files:
        for variable in _parse_env_file(snapshot.read(path) or ""):
            found.setdefault(variable["key"], variable)
    if not found:
        for path in snapshot.files:
            if not path.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".mjs")):
                continue
            text = snapshot.read(path) or ""
            for pattern, required in CODE_ENV_PATTERNS:
                for key in pattern.findall(text):
                    if key not in IGNORED_CODE_ENV and key not in found:
                        found[key] = {"key": key, "value": f"<{key.lower()}>", "required": required}
            if len(found) >= MAX_ENV_VARS:
                break
    return list(found.values())[:MAX_ENV_VARS]


def prerequisites(profile: StackProfile) -> list[dict]:
    """`available` marks what the project needs to run; optional tooling is listed unchecked."""
    items = []
    ecosystems = {c.ecosystem: c for c in reversed(profile.components)}
    if node := ecosystems.get("node"):
        items.append({"name": "Node.js", "version": node.runtime_version or "LTS", "available": True})
        if node.package_manager != "npm":
            items.append({"name": node.package_manager, "version": "latest", "available": True})
    if python := ecosystems.get("python"):
        items.append({"name": "Python", "version": python.runtime_version or "≥ 3.10", "available": True})
        if python.package_manager in ("poetry", "uv", "pipenv"):
            items.append({"name": python.package_manager, "version": "latest", "available": True})
    for database in profile.databases:
        if database in DATABASE_PREREQS:
            items.append({"name": database, "version": DATABASE_PREREQS[database], "available": True})
    for broker in profile.brokers:
        if broker in BROKER_PREREQS:
            items.append({"name": broker, "version": BROKER_PREREQS[broker], "available": True})
    items.append({"name": "Docker", "version": "recommended" if profile.has_compose else "optional", "available": False})
    return items


def _in(component: Component, command: str) -> str:
    return f"cd {component.path} && {command}" if component.path else command


def _python_app_module(snapshot: RepoSnapshot, component: Component, factory: str) -> str | None:
    """Dotted path of the module that instantiates the ASGI/WSGI app, e.g. 'app.main'."""
    prefix = f"{component.path}/" if component.path else ""
    assignment = re.compile(rf"^\w+\s*=\s*{factory}\(", re.MULTILINE)
    for path in snapshot.files:
        if path.startswith(prefix) and path.endswith(".py") and assignment.search(snapshot.read(path) or ""):
            return path[len(prefix):-3].replace("/", ".").removeprefix("src.")
    return None


def _python_steps(snapshot: RepoSnapshot, component: Component) -> list[dict]:
    install = {
        "poetry": "poetry install",
        "uv": "uv sync",
        "pipenv": "pipenv install --dev",
    }.get(component.package_manager)
    steps = []
    if not install:
        steps.append({"command": _in(component, "python -m venv venv && source venv/bin/activate"), "comment": "venv"})
        install = "pip install -r requirements.txt" if component.install_from == "requirements.txt" else "pip install -e ."
    steps.append({"command": _in(component, install), "comment": "deps"})

    run = None
    if "django" in component.packages:
        steps.append({"command": _in(component, "python manage.py migrate"), "comment": "migrations"})
        run = "python manage.py runserver"
    else:
        if snapshot.exists(join(component.path, "alembic.ini")):
            steps.append({"command": _in(component, "alembic upgrade head"), "comment": "migrations"})
        if "fastapi" in component.packages or "starlette" in component.packages:
            module = _python_app_module(snapshot, component, "FastAPI") or "main"
            run = f"uvicorn {module}:app --reload"
        elif "flask" in component.packages:
            run = "flask run --debug"
    if run:
        steps.append({"command": _in(component, run), "comment": "start"})
    return steps


def _node_steps(component: Component) -> list[dict]:
    manager = component.package_manager
    steps = [{"command": _in(component, f"{manager} install"), "comment": "deps"}]
    if "prisma" in component.packages or "@prisma/client" in component.packages:
        steps.append({"command": _in(component, "npx prisma migrate dev"), "comment": "migrations"})
    script = next((s for s in DEV_SCRIPT_PREFERENCE if s in component.scripts), None)
    if script:
        run = f"{manager} start" if script == "start" else f"{manager} run {script}"
        steps.append({"command": _in(component, run), "comment": "start"})
    return steps


def quick_start(snapshot: RepoSnapshot, profile: StackProfile, repo: Repository) -> list[dict]:
    steps = [
        {"command": f"git clone {repo.url}.git" if not repo.url.endswith(".git") else f"git clone {repo.url}", "comment": "clone"},
        {"command": f"cd {repo.name}", "comment": "enter"},
    ]
    if profile.has_compose and (profile.databases or profile.brokers):
        steps.append({"command": "docker compose up -d", "comment": "services"})
    for env_file in profile.env_files:
        directory, name = (env_file.rsplit("/", 1) if "/" in env_file else ("", env_file))
        target = ".env.local" if name == ".env.local.example" else ".env"
        command = f"cp {name} {target}"
        steps.append({"command": f"cd {directory} && {command}" if directory else command, "comment": "env"})
    # Backends first so the API is up before the frontend dev server starts
    for component in sorted(profile.components, key=lambda c: c.kind == "frontend"):
        steps += _python_steps(snapshot, component) if component.ecosystem == "python" else _node_steps(component)
    return steps


def suite_command(snapshot: RepoSnapshot, profile: StackProfile) -> str | None:
    # Backend suites first: they usually cover the core logic
    for component in sorted(profile.components, key=lambda c: c.kind == "frontend"):
        if component.ecosystem == "python" and (
            "pytest" in component.packages or any(p.startswith(join(component.path, "tests/")) for p in snapshot.files)
        ):
            return _in(component, "pytest")
        if component.ecosystem == "node" and "test" in component.scripts:
            return _in(component, f"{component.package_manager} test")
    return None
