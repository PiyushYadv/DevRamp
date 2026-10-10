import re
from dataclasses import dataclass

# Owner: 1-39 alphanumerics/hyphens. Repo: letters, digits, ".", "_", "-".
_GITHUB_URL = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/"
    r"(?P<owner>[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/"
    r"(?P<name>[A-Za-z0-9._-]+?)"
    r"(?:\.git)?/?(?:[?#].*)?$"
)


@dataclass(frozen=True)
class GitHubRepoRef:
    owner: str
    name: str

    @property
    def full_name(self) -> str:
        return f"{self.owner}/{self.name}"

    @property
    def clone_url(self) -> str:
        return f"https://github.com/{self.owner}/{self.name}.git"

    @property
    def html_url(self) -> str:
        return f"https://github.com/{self.owner}/{self.name}"


def parse_github_url(url: str) -> GitHubRepoRef | None:
    """Accepts https://github.com/owner/repo (optionally .git, trailing slash, query); None if not a GitHub repo URL."""
    match = _GITHUB_URL.match(url.strip())
    if not match or match["name"] in (".", ".."):
        return None
    return GitHubRepoRef(owner=match["owner"], name=match["name"])
