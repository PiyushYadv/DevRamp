from app.services.analysis.dependencies import CodeGroup

MODULE_STYLES = [
    {"color": "text-indigo-400", "accentBg": "bg-indigo-500/10", "accentBorder": "border-indigo-500/30"},
    {"color": "text-emerald-400", "accentBg": "bg-emerald-500/10", "accentBorder": "border-emerald-500/30"},
    {"color": "text-orange-400", "accentBg": "bg-orange-500/10", "accentBorder": "border-orange-500/30"},
]
KEY_AREAS = 4


def _join(items: list[str]) -> str:
    if not items:
        return ""
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + f" and {items[-1]}"


def _minutes(n: int) -> str:
    return f"~{max(10, min(n, 90))} min"


def build_modules(analysis: dict) -> list[dict]:
    """Three onboarding modules (overview, setup, code tour) written from the repository analysis."""
    repo_name, architecture, setup = analysis["repo_name"], analysis["architecture"], analysis["setup"]
    groups: list[CodeGroup] = analysis["groups"][:KEY_AREAS]
    names = {g.key: g.name for g in analysis["groups"]}

    overview = [
        {"heading": f"What is {repo_name}?", "body": architecture["summary"]},
        {"heading": "Technology stack", "body": f"Built with {_join(architecture['tags'])}." if architecture["tags"]
         else "No package manifests were detected, so the stack is inferred from source files only."},
        {"heading": "How the pieces connect", "body": analysis["flow"] + " The Service Topology diagram shows the full graph."
         if analysis["flow"] else "This repository is a single unit with no external services detected."},
    ]

    required = [v["key"] for v in setup["environmentVariables"] if v["required"]]
    commands = [step["command"] for step in architecture["quickStart"]]
    local_setup = [
        {"heading": "Prerequisites", "body": "Install " + _join(
            [f"{p['name']} {p['version']}" for p in setup["prerequisites"] if p["available"]]) + "."
         if any(p["available"] for p in setup["prerequisites"]) else "No runtime prerequisites were detected."},
        {"heading": "First-time setup", "body": "Run these from the repository root: " + "; then ".join(f"`{c}`" for c in commands) + "."},
        {"heading": "Configuration", "body": (f"Set {_join([f'`{k}`' for k in required])} in your `.env` before starting."
                                               if required else "No required environment variables were detected.")
         + (f" {len(setup['environmentVariables']) - len(required)} more are optional." if len(setup["environmentVariables"]) > len(required) else "")},
    ]
    if analysis["test_command"]:
        local_setup.append({"heading": "Verifying your setup", "body": f"Run `{analysis['test_command']}` to confirm the test suite passes."})

    tour = []
    for group in groups:
        body = f"{len(group.files)} file{'s' if len(group.files) != 1 else ''} under `{group.key}`."
        if group.symbols:
            body += f" Key symbols: {_join([f'`{s}`' for s in group.symbols[:5]])}."
        if group.deps:
            body += f" Depends on {_join([names[d] for d in group.deps[:4]])}."
        used_by = [g.name for g in analysis["groups"] if group.key in g.deps]
        if used_by:
            body += f" Used by {_join(used_by[:4])}."
        tour.append({"heading": group.name, "body": body})
    if not tour:
        tour.append({"heading": "Source layout", "body": "No Python or JavaScript/TypeScript modules were found to map."})

    modules = [
        (1, "Architecture Overview", "Understand the system topology and key design decisions.", overview, _minutes(5 * len(overview) + 5)),
        (2, "Local Setup", "Get the project running on your machine end-to-end.", local_setup, _minutes(5 * len(commands) + 5)),
        (3, "Key Code Areas", "Tour the modules you'll touch most often.", tour, _minutes(10 * len(tour))),
    ]
    return [
        {"n": n, "title": title, "subtitle": subtitle, "duration": duration, "sections": sections, **MODULE_STYLES[n - 1]}
        for n, title, subtitle, sections, duration in modules
    ]


def build_checklist(analysis: dict) -> dict[int, list[dict]]:
    architecture, setup = analysis["architecture"], analysis["setup"]
    overview = [
        "Read the architecture summary",
        "Review the service topology diagram",
        f"Identify where {architecture['tags'][0]} is used" if architecture["tags"] else "Skim the repository layout",
        "Ask the AI copilot one architecture question",
    ]

    labels = {
        "clone": "Clone the repository", "services": "Start supporting services with Docker Compose",
        "env": "Configure .env from the example file", "venv": "Create a Python virtual environment",
        "deps": "Install dependencies", "migrations": "Run database migrations", "start": "Start the dev server",
    }
    local = []
    for step in architecture["quickStart"]:
        label = labels.get(step["comment"])
        if label and label not in local:
            local.append(label)
    if any(v["required"] for v in setup["environmentVariables"]) and labels["env"] not in local:
        local.insert(1, "Fill in the required environment variables")
    if analysis["test_command"]:
        local.append(f"Run the test suite ({analysis['test_command'].rsplit('&& ', 1)[-1]})")

    groups: list[CodeGroup] = analysis["groups"][:KEY_AREAS]
    tour = [f"Read the {g.name} module source" for g in groups]
    if len(groups) > 1:
        entry = max(groups, key=lambda g: len(g.deps))
        tour.append(f"Trace a request from {entry.name} through its dependencies")
    tour.append("Ask the AI copilot to explain a function you found confusing")

    def items(prefix: str, entries: list[str]) -> list[dict]:
        return [{"id": f"{prefix}{i}", "label": label, "done": False} for i, label in enumerate(entries, 1)]

    return {1: items("a", overview), 2: items("s", local), 3: items("k", tour)}
