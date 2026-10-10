import re
from app.models.repository import Repository
from app.services.analysis.stack import TASK_QUEUES, Component, StackProfile

DATABASE_PORTS = {
    "PostgreSQL": 5432, "MySQL": 3306, "MongoDB": 27017, "Redis": 6379,
    "Elasticsearch": 9200, "Cassandra": 9042, "Neo4j": 7687, "RabbitMQ": 5672, "Kafka": 9092,
}
# Stores that support the primary database rather than hold the system of record
SUPPORTING_STORES = {
    "Redis": "Cache / Queue", "Pinecone": "Vector index", "ChromaDB": "Vector index", "Qdrant": "Vector index",
    "Weaviate": "Vector index", "Elasticsearch": "Search index",
}
# Tailwind classes the workspace uses per node kind (same palette as the Figma mock)
NODE_STYLES = {
    "client": ("text-sky-400", "bg-sky-500/10 border-sky-500/30"),
    "frontend": ("text-sky-400", "bg-sky-500/10 border-sky-500/30"),
    "server": ("text-indigo-400", "bg-indigo-500/10 border-indigo-500/30"),
    "database": ("text-emerald-400", "bg-emerald-500/10 border-emerald-500/30"),
    "broker": ("text-amber-400", "bg-amber-500/10 border-amber-500/30"),
    "service": ("text-orange-400", "bg-orange-500/10 border-orange-500/30"),
}
MAX_TAGS = 8
MAX_EXTERNAL_NODES = 5


def _component_label(component: Component, repo: Repository) -> str:
    if component.path:
        return component.name
    return {"frontend": "Web App", "backend": "API Server", "fullstack": "App Server"}.get(component.kind, repo.name)


def _component_sub(component: Component) -> str:
    parts = [component.framework or component.language]
    if component.build_tool and component.kind == "frontend":
        parts.append(component.build_tool)
    return " / ".join(parts)


def _node(node_id: str, label: str, sub: str, kind: str, shape: str) -> dict:
    color, bg = NODE_STYLES[kind]
    return {"id": node_id, "label": label, "sub": sub, "kind": kind, "shape": shape, "color": color, "bg": bg}


def build_graph(profile: StackProfile, repo: Repository) -> tuple[list[dict], list[tuple[str, str, str]]]:
    """Nodes plus (source, target, label) edges describing how a request flows through the system."""
    nodes: list[dict] = []
    edges: list[tuple[str, str, str]] = []
    frontends, servers = profile.frontends, profile.servers
    libraries = [c for c in profile.components if c.kind == "library"]

    if frontends or servers:
        nodes.append(_node("client", "Client", "Browser", "client", "stadium"))
    for i, component in enumerate(frontends):
        nodes.append(_node(f"web{i}", _component_label(component, repo), _component_sub(component), "frontend", "rect"))
        edges.append(("client", f"web{i}", "HTTPS"))
    for i, component in enumerate(servers):
        nodes.append(_node(f"api{i}", _component_label(component, repo), _component_sub(component), "server", "rect"))
        callers = [f"web{j}" for j in range(len(frontends))] or ["client"]
        edges += [(caller, f"api{i}", "HTTP/REST") for caller in callers]
    if not frontends and not servers:
        targets = libraries or [None]
        for i, component in enumerate(targets):
            label = _component_label(component, repo) if component else repo.name
            sub = _component_sub(component) if component else (repo.language or "Source")
            nodes.append(_node(f"lib{i}", label, sub, "server", "rect"))

    # Data stores and services hang off the servers (or the frontend for client-only apps)
    owners = [n["id"] for n in nodes if n["kind"] == "server"] or [n["id"] for n in nodes if n["kind"] == "frontend"]
    owner = owners[0] if owners else None
    orm = profile.orms[0] if profile.orms else None
    primary_seen = False
    for i, database in enumerate(profile.databases):
        supporting = database in SUPPORTING_STORES
        role = SUPPORTING_STORES[database] if supporting else ("Database" if primary_seen else "Primary DB")
        primary_seen = primary_seen or not supporting
        nodes.append(_node(f"db{i}", database, role, "database", "cylinder"))
        if owner:
            port = DATABASE_PORTS.get(database)
            if not supporting and orm:
                via = orm
            elif port:
                via = f"TCP/{port}"
            else:
                via = "file" if database == "SQLite" else "HTTPS"
            edges.append((owner, f"db{i}", via))
    for i, broker in enumerate(profile.brokers):
        queue = broker in TASK_QUEUES
        nodes.append(_node(f"mq{i}", broker, "Task queue" if queue else "Message broker", "broker", "queue"))
        if owner:
            edges.append((owner, f"mq{i}", "enqueue jobs" if queue else "publish / consume"))
    for i, service in enumerate(profile.external_services[:MAX_EXTERNAL_NODES]):
        nodes.append(_node(f"ext{i}", service, "External service", "service", "hexagon"))
        if owner:
            edges.append((owner, f"ext{i}", "HTTPS"))
    return nodes, edges


# Stroke/text colours mirror NODE_STYLES so the graph matches the dark workspace
MERMAID_CLASSES = {
    "client": "#38bdf8", "frontend": "#38bdf8", "server": "#818cf8",
    "database": "#34d399", "broker": "#fbbf24", "service": "#fb923c",
}


def _mermaid_label(node: dict) -> str:
    text = f"{node['label']}<br/><small>{node['sub']}</small>" if node["sub"] else node["label"]
    return text.replace('"', "#quot;")


MERMAID_SHAPES = {
    "stadium": '(["{}"])', "rect": '["{}"]', "cylinder": '[("{}")]', "hexagon": '{{{{"{}"}}}}', "queue": '[/"{}"/]',
}


def to_mermaid(nodes: list[dict], edges: list[tuple[str, str, str]]) -> str:
    lines = ["flowchart TD"]
    for node in nodes:
        lines.append(f"  {node['id']}" + MERMAID_SHAPES[node["shape"]].format(_mermaid_label(node)))
    for source, target, label in edges:
        safe = re.sub(r'["|]', "", label)
        lines.append(f"  {source} -->|{safe}| {target}" if safe else f"  {source} --> {target}")
    for kind in sorted({n["kind"] for n in nodes}):
        color = MERMAID_CLASSES[kind]
        lines.append(f"  classDef {kind} fill:{color}1a,stroke:{color},color:#e2e8f0")
        lines.append(f"  class {','.join(n['id'] for n in nodes if n['kind'] == kind)} {kind}")
    return "\n".join(lines)


def tags(profile: StackProfile) -> list[str]:
    labels = []
    for component in profile.components:
        labels += [component.framework, component.build_tool if component.kind == "frontend" else None]
    labels += profile.languages + profile.databases + profile.orms + profile.auth + profile.services
    return list(dict.fromkeys(label for label in labels if label))[:MAX_TAGS]


def _join(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + f" and {items[-1]}"


def summary(profile: StackProfile, repo: Repository) -> str:
    def describe(component: Component) -> str:
        where = f" in `{component.path}/`" if component.path else ""
        return f"a {_component_sub(component)} {component.kind if component.kind != 'library' else 'package'}{where}"

    frontends, servers = profile.frontends, profile.servers
    if frontends and servers:
        opening = f"Full-stack application with {_join([describe(c) for c in frontends + servers])}."
    elif servers:
        style = "Monolithic" if len(servers) == 1 else "Multi-service"
        opening = f"{style} backend built as {_join([describe(c) for c in servers])}."
    elif frontends:
        opening = f"Client-side application built as {_join([describe(c) for c in frontends])}."
    elif profile.components:
        opening = f"{profile.languages[0]} library ({_join([describe(c) for c in profile.components])})."
    else:
        opening = f"{repo.language or 'Source'} repository without a recognised package manifest."

    sentences = [opening]
    if repo.description:
        sentences.insert(0, repo.description.rstrip(".") + ".")
    primary = [d for d in profile.databases if d not in SUPPORTING_STORES]
    if primary:
        via = f" accessed through {profile.orms[0]}" if profile.orms else ""
        sentences.append(f"Persistent data lives in {_join(primary)}{via}.")
    supporting = [f"{d} ({SUPPORTING_STORES[d].lower()})" for d in profile.databases if d in SUPPORTING_STORES]
    if supporting:
        sentences.append(f"Also uses {_join(supporting)}.")
    if profile.brokers:
        sentences.append(f"Async work flows through {_join(profile.brokers)}.")
    if profile.auth:
        sentences.append(f"Authentication uses {_join(profile.auth)}.")
    if profile.external_services:
        sentences.append(f"Integrates with {_join(profile.external_services)}.")
    return " ".join(sentences)


def describe_flow(nodes: list[dict], edges: list[tuple[str, str, str]]) -> str:
    """Plain-English walk of the graph: the request path first, then what the servers talk to."""
    labels = {n["id"]: n["label"] for n in nodes}
    path_edges = [e for e in edges if e[1].startswith(("web", "api"))]
    sentences = []
    if path_edges:
        hops = [f"{labels[path_edges[0][0]]}"] + [f"{labels[t]} ({via})" for _, t, via in path_edges]
        sentences.append("Requests travel " + " → ".join(dict.fromkeys(hops)) + ".")
    outbound: dict[str, list[str]] = {}
    for source, target, via in edges:
        if not target.startswith(("web", "api")):
            outbound.setdefault(labels[source], []).append(f"{labels[target]} ({via})")
    for source, targets in outbound.items():
        sentences.append(f"{source} talks to {_join(targets)}.")
    return " ".join(sentences)


def connections(edges: list[tuple[str, str, str]], nodes: list[dict]) -> list[str]:
    labels = {n["id"]: n["label"] for n in nodes}
    seen = []
    for _, target, via in edges:
        # Hops between our own components are self-explanatory; name the store/service otherwise
        entry = f"→ {via}" if target.startswith(("web", "api")) else f"→ {via} ({labels[target]})"
        if entry not in seen:
            seen.append(entry)
    return seen
