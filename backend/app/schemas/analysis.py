from app.schemas.base import CamelModel


class ArchitectureNode(CamelModel):
    id: str
    label: str
    sub: str
    kind: str
    color: str
    bg: str


class SetupCommand(CamelModel):
    command: str
    comment: str


class ArchitectureResponse(CamelModel):
    tags: list[str]
    summary: str
    connections: list[str]
    quick_start: list[SetupCommand]
    nodes: list[ArchitectureNode]
    mermaid: str


class EnvironmentVariable(CamelModel):
    key: str
    value: str
    required: bool


class Prerequisite(CamelModel):
    name: str
    version: str
    available: bool


class SetupResponse(CamelModel):
    environment_variables: list[EnvironmentVariable]
    prerequisites: list[Prerequisite]


class DependencyModule(CamelModel):
    name: str
    deps: list[str]
    color: str


class ModuleSection(CamelModel):
    heading: str
    body: str


class OnboardingModule(CamelModel):
    n: int
    title: str
    subtitle: str
    duration: str
    color: str
    accent_bg: str
    accent_border: str
    sections: list[ModuleSection]


class ChecklistItem(CamelModel):
    id: str
    label: str
    done: bool
