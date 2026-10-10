import json
import re
import tomllib
from dataclasses import dataclass, field
from app.services.analysis.scan import RepoSnapshot, join, parent_dir

# Package name -> what it tells us about the stack. Names are lowercase; Python names use '-' not '_'.
BACKEND_FRAMEWORKS = {
    "fastapi": "FastAPI", "flask": "Flask", "django": "Django", "starlette": "Starlette",
    "aiohttp": "aiohttp", "sanic": "Sanic", "tornado": "Tornado", "litestar": "Litestar",
    "express": "Express", "@nestjs/core": "NestJS", "koa": "Koa", "fastify": "Fastify", "hono": "Hono",
}
FULLSTACK_FRAMEWORKS = {"next": "Next.js", "nuxt": "Nuxt", "@remix-run/react": "Remix", "@sveltejs/kit": "SvelteKit", "astro": "Astro"}
FRONTEND_FRAMEWORKS = {
    "react": "React", "vue": "Vue", "svelte": "Svelte", "@angular/core": "Angular", "solid-js": "SolidJS", "preact": "Preact",
}
BUILD_TOOLS = {"vite": "Vite", "webpack": "Webpack", "parcel": "Parcel"}
DATABASES = {
    "psycopg2": "PostgreSQL", "psycopg2-binary": "PostgreSQL", "psycopg": "PostgreSQL", "asyncpg": "PostgreSQL",
    "pg": "PostgreSQL", "postgres": "PostgreSQL", "@neondatabase/serverless": "PostgreSQL",
    "pymysql": "MySQL", "mysqlclient": "MySQL", "aiomysql": "MySQL", "mysql2": "MySQL", "mysql": "MySQL",
    "pymongo": "MongoDB", "motor": "MongoDB", "mongodb": "MongoDB", "mongoose": "MongoDB",
    "redis": "Redis", "aioredis": "Redis", "ioredis": "Redis",
    "better-sqlite3": "SQLite", "sqlite3": "SQLite", "aiosqlite": "SQLite",
    "elasticsearch": "Elasticsearch", "@elastic/elasticsearch": "Elasticsearch",
    "pinecone": "Pinecone", "pinecone-client": "Pinecone", "@pinecone-database/pinecone": "Pinecone",
    "chromadb": "ChromaDB", "qdrant-client": "Qdrant", "weaviate-client": "Weaviate",
    "cassandra-driver": "Cassandra", "neo4j": "Neo4j", "boto3-dynamodb": "DynamoDB",
}
ORMS = {
    "sqlalchemy": "SQLAlchemy", "sqlmodel": "SQLModel", "tortoise-orm": "Tortoise ORM", "peewee": "Peewee",
    "prisma": "Prisma", "@prisma/client": "Prisma", "typeorm": "TypeORM", "sequelize": "Sequelize",
    "drizzle-orm": "Drizzle", "mongoose": "Mongoose", "@mikro-orm/core": "MikroORM", "knex": "Knex",
}
SERVICES = {
    "stripe": "Stripe", "celery": "Celery", "rq": "RQ", "bullmq": "BullMQ", "bull": "Bull",
    "kafkajs": "Kafka", "confluent-kafka": "Kafka", "aiokafka": "Kafka", "kafka-python": "Kafka",
    "pika": "RabbitMQ", "aio-pika": "RabbitMQ", "amqplib": "RabbitMQ",
    "boto3": "AWS", "@aws-sdk/client-s3": "AWS S3", "aws-sdk": "AWS",
    "openai": "OpenAI", "anthropic": "Anthropic", "@anthropic-ai/sdk": "Anthropic",
    "google-generativeai": "Google Gemini", "google-genai": "Google Gemini", "@google/generative-ai": "Google Gemini",
    "@google/genai": "Google Gemini", "firebase": "Firebase", "firebase-admin": "Firebase",
    "@supabase/supabase-js": "Supabase", "supabase": "Supabase", "sentry-sdk": "Sentry", "@sentry/node": "Sentry",
    "twilio": "Twilio", "sendgrid": "SendGrid", "@sendgrid/mail": "SendGrid", "gitpython": "GitHub",
    "@octokit/rest": "GitHub", "pygithub": "GitHub",
}
AUTH = {
    "pyjwt": "JWT", "python-jose": "JWT", "jsonwebtoken": "JWT", "jose": "JWT",
    "passport": "Passport", "next-auth": "NextAuth", "@auth/core": "Auth.js", "django-allauth": "allauth",
    "authlib": "OAuth", "flask-login": "Flask-Login", "@clerk/clerk-react": "Clerk", "@auth0/auth0-react": "Auth0",
}
# docker-compose image base name (registry/owner and tag stripped) -> database / service
COMPOSE_IMAGES = {
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "postgis": "PostgreSQL", "mysql": "MySQL", "mariadb": "MySQL",
    "mongo": "MongoDB", "mongodb": "MongoDB", "redis": "Redis", "redis-stack": "Redis", "valkey": "Redis",
    "elasticsearch": "Elasticsearch", "rabbitmq": "RabbitMQ", "cp-kafka": "Kafka", "kafka": "Kafka",
}
# Manifests under these top-level folders describe samples or tooling, not the application
NON_APP_DIRS = {"docs", "doc", "examples", "example", "samples", "test", "tests", "scripts", "e2e", "benchmarks"}
DATABASE_URL_SCHEMES = {
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "mongodb+srv": "MongoDB", "redis": "Redis", "rediss": "Redis", "sqlite": "SQLite",
}
MESSAGE_BROKERS = {"Kafka", "RabbitMQ"}
TASK_QUEUES = {"Celery", "RQ", "BullMQ", "Bull"}
ASYNC_SERVICES = MESSAGE_BROKERS | TASK_QUEUES

ENV_EXAMPLE_FILES = (".env.example", ".env.sample", ".env.template", ".env.dist", "example.env", ".env.local.example")


@dataclass
class Component:
    """One deployable unit, identified by its manifest's directory ('' for the repository root)."""

    path: str
    ecosystem: str  # "node" | "python"
    packages: set[str] = field(default_factory=set)
    scripts: dict[str, str] = field(default_factory=dict)
    package_manager: str = "npm"
    runtime_version: str | None = None
    install_from: str | None = None  # Python manifest used for installation

    @property
    def name(self) -> str:
        return self.path.rsplit("/", 1)[-1] if self.path else ""

    def _first(self, catalog: dict[str, str]) -> str | None:
        return next((catalog[p] for p in catalog if p in self.packages), None)

    @property
    def framework(self) -> str | None:
        return self._first(FULLSTACK_FRAMEWORKS) or self._first(BACKEND_FRAMEWORKS) or self._first(FRONTEND_FRAMEWORKS)

    @property
    def build_tool(self) -> str | None:
        return self._first(BUILD_TOOLS)

    @property
    def kind(self) -> str:
        if self._first(FULLSTACK_FRAMEWORKS):
            return "fullstack"
        if self._first(BACKEND_FRAMEWORKS):
            return "backend"
        if self._first(FRONTEND_FRAMEWORKS):
            return "frontend"
        return "library"

    @property
    def language(self) -> str:
        if self.ecosystem == "python":
            return "Python"
        return "TypeScript" if "typescript" in self.packages else "JavaScript"


@dataclass
class StackProfile:
    components: list[Component]
    databases: list[str]
    orms: list[str]
    services: list[str]
    auth: list[str]
    has_compose: bool
    env_files: list[str]
    languages: list[str]

    @property
    def frontends(self) -> list[Component]:
        return [c for c in self.components if c.kind == "frontend"]

    @property
    def servers(self) -> list[Component]:
        return [c for c in self.components if c.kind in ("backend", "fullstack")]

    @property
    def brokers(self) -> list[str]:
        """Message brokers and task queues: everything that carries async work."""
        return [s for s in self.services if s in ASYNC_SERVICES]

    @property
    def external_services(self) -> list[str]:
        return [s for s in self.services if s not in ASYNC_SERVICES]


def _normalize_py(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _python_requirement_name(line: str) -> str | None:
    line = line.split("#", 1)[0].strip()
    if not line or line.startswith(("-", "git+", "http")):
        return None
    match = re.match(r"[A-Za-z0-9][A-Za-z0-9._-]*", line)
    return _normalize_py(match.group(0)) if match else None


def _read_package_json(snapshot: RepoSnapshot, path: str) -> Component | None:
    try:
        data = json.loads(snapshot.read(path) or "")
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    directory = parent_dir(path)
    packages = set()
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        if isinstance(data.get(key), dict):
            packages.update(name.lower() for name in data[key])
    scripts = {k: v for k, v in (data.get("scripts") or {}).items() if isinstance(v, str)}
    engines = data.get("engines") if isinstance(data.get("engines"), dict) else {}

    manager = "npm"
    declared = str(data.get("packageManager") or "")
    for candidate, lockfile in (("pnpm", "pnpm-lock.yaml"), ("yarn", "yarn.lock"), ("bun", "bun.lockb")):
        if declared.startswith(candidate) or snapshot.exists(join(directory, lockfile)) or snapshot.exists(lockfile):
            manager = candidate
            break

    runtime = engines.get("node") if isinstance(engines.get("node"), str) else None
    if not runtime:
        nvmrc = snapshot.read(join(directory, ".nvmrc")) or snapshot.read(".nvmrc")
        runtime = nvmrc.strip() if nvmrc and nvmrc.strip() else None
    return Component(directory, "node", packages, scripts, manager, runtime)


def _read_python_manifests(snapshot: RepoSnapshot, directory: str) -> Component:
    component = Component(directory, "python", package_manager="pip")
    requirements = join(directory, "requirements.txt")
    if snapshot.exists(requirements):
        component.install_from = "requirements.txt"
        for line in (snapshot.read(requirements) or "").splitlines():
            if name := _python_requirement_name(line):
                component.packages.add(name)

    pyproject = join(directory, "pyproject.toml")
    if snapshot.exists(pyproject):
        try:
            data = tomllib.loads(snapshot.read(pyproject) or "")
        except tomllib.TOMLDecodeError:
            data = {}
        project = data.get("project", {})
        poetry = data.get("tool", {}).get("poetry", {})
        for dep in project.get("dependencies", []):
            if isinstance(dep, str) and (name := _python_requirement_name(dep)):
                component.packages.add(name)
        for dep in poetry.get("dependencies", {}):
            if dep.lower() != "python":
                component.packages.add(_normalize_py(dep))
        component.runtime_version = project.get("requires-python") or poetry.get("dependencies", {}).get("python")
        if poetry:
            component.package_manager = "poetry"
        elif snapshot.exists(join(directory, "uv.lock")):
            component.package_manager = "uv"
        component.install_from = component.install_from or "pyproject.toml"

    pipfile = join(directory, "Pipfile")
    if snapshot.exists(pipfile):
        try:
            data = tomllib.loads(snapshot.read(pipfile) or "")
        except tomllib.TOMLDecodeError:
            data = {}
        component.packages.update(_normalize_py(name) for name in data.get("packages", {}))
        component.package_manager = "pipenv"
        component.install_from = component.install_from or "Pipfile"

    if not component.runtime_version:
        pinned = snapshot.read(join(directory, ".python-version")) or snapshot.read(".python-version")
        component.runtime_version = pinned.strip() if pinned and pinned.strip() else None
    if "django" not in component.packages and snapshot.exists(join(directory, "manage.py")):
        component.packages.add("django")
    return component


def _compose_services(snapshot: RepoSnapshot) -> tuple[bool, set[str]]:
    found: set[str] = set()
    files = snapshot.find("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml", max_depth=1)
    for path in files:
        for image in re.findall(r"^\s*image:\s*['\"]?([\w./:-]+)", snapshot.read(path) or "", re.MULTILINE):
            base = image.lower().split(":", 1)[0].rsplit("/", 1)[-1]
            if base in COMPOSE_IMAGES:
                found.add(COMPOSE_IMAGES[base])
    return bool(files), found


def _env_databases(snapshot: RepoSnapshot, env_files: list[str]) -> set[str]:
    found = set()
    for path in env_files:
        for scheme in re.findall(r"=\s*['\"]?([a-z+]+)://", snapshot.read(path) or ""):
            if scheme in DATABASE_URL_SCHEMES:
                found.add(DATABASE_URL_SCHEMES[scheme])
    return found


def _ordered(labels) -> list[str]:
    return list(dict.fromkeys(labels))


def detect_stack(snapshot: RepoSnapshot) -> StackProfile:
    def is_app_manifest(path: str) -> bool:
        return path.split("/", 1)[0] not in NON_APP_DIRS or "/" not in path

    components: list[Component] = []
    for path in filter(is_app_manifest, snapshot.find("package.json")):
        if component := _read_package_json(snapshot, path):
            components.append(component)
    python_dirs = _ordered(
        parent_dir(p) for p in snapshot.find("requirements.txt", "pyproject.toml", "Pipfile", "manage.py")
        if is_app_manifest(p)
    )
    components.extend(_read_python_manifests(snapshot, d) for d in python_dirs)

    # A root package.json that only orchestrates sub-packages (workspaces, lint tooling) is not a component
    if len(components) > 1:
        components = [c for c in components if c.path or c.kind != "library" or c.ecosystem == "python"]
    components.sort(key=lambda c: ({"frontend": 0, "fullstack": 1, "backend": 2, "library": 3}[c.kind], c.path))

    def collect(catalog: dict[str, str]) -> list[str]:
        return _ordered(catalog[p] for c in components for p in sorted(c.packages) if p in catalog)

    env_files = snapshot.find(*ENV_EXAMPLE_FILES)
    has_compose, compose_found = _compose_services(snapshot)
    databases = collect(DATABASES)
    services = collect(SERVICES)
    for label in sorted(compose_found | _env_databases(snapshot, env_files)):
        if label in MESSAGE_BROKERS:
            services = _ordered([*services, label])
        else:
            databases = _ordered([*databases, label])
    return StackProfile(
        components=components,
        databases=databases,
        orms=collect(ORMS),
        services=services,
        auth=collect(AUTH),
        has_compose=has_compose,
        env_files=env_files,
        languages=_ordered(c.language for c in components),
    )
