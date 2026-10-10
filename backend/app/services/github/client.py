from dataclasses import dataclass
import httpx
from app.exceptions.github import GitHubAPIError, GitHubOAuthError, GitHubRateLimitError

API_URL = "https://api.github.com"
MAX_REPO_PAGES = 5  # 500 repositories is plenty for the picker


@dataclass
class GitHubProfile:
    id: str
    login: str
    name: str
    html_url: str
    email: str


@dataclass
class GitHubRepo:
    id: str
    owner: str
    name: str
    full_name: str
    html_url: str
    private: bool
    default_branch: str
    language: str | None
    stars: int
    pushed_at: str | None
    size_kb: int
    description: str | None

    @classmethod
    def from_api(cls, data: dict) -> "GitHubRepo":
        return cls(
            id=str(data["id"]),
            owner=data["owner"]["login"],
            name=data["name"],
            full_name=data["full_name"],
            html_url=data["html_url"],
            private=bool(data.get("private")),
            default_branch=data.get("default_branch") or "main",
            language=data.get("language"),
            stars=int(data.get("stargazers_count") or 0),
            pushed_at=data.get("pushed_at"),
            size_kb=int(data.get("size") or 0),
            description=data.get("description"),
        )


class GitHubClient:
    """GitHub REST client. Without a token it makes anonymous calls (public data, 60 requests/hour per IP)."""

    def __init__(self, access_token: str | None = None):
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        self._authenticated = bool(access_token)
        self._client = httpx.Client(base_url=API_URL, headers=headers, timeout=10.0)

    def __enter__(self) -> "GitHubClient":
        return self

    def __exit__(self, *exc) -> None:
        self._client.close()

    def _request(self, path: str, **params) -> httpx.Response:
        try:
            response = self._client.get(path, params=params or None)
        except httpx.HTTPError as e:
            raise GitHubAPIError("Could not reach GitHub") from e
        if response.status_code == 401 and self._authenticated:
            raise GitHubOAuthError("GitHub authorization expired. Please reconnect GitHub.")
        if response.status_code in (403, 429) and response.headers.get("x-ratelimit-remaining") == "0":
            raise GitHubRateLimitError()
        return response

    def _get(self, path: str, **params):
        response = self._request(path, **params)
        if response.status_code >= 400:
            raise GitHubAPIError(f"GitHub request failed ({response.status_code})")
        return response.json()

    def get_profile(self) -> GitHubProfile:
        user = self._get("/user")
        return GitHubProfile(
            id=str(user["id"]),
            login=user["login"],
            name=user.get("name") or user["login"],
            html_url=user["html_url"],
            email=self._primary_email(user),
        )

    def get_repository(self, owner: str, name: str) -> GitHubRepo | None:
        """None when the repository doesn't exist or isn't visible to this client (GitHub returns 404 for both)."""
        response = self._request(f"/repos/{owner}/{name}")
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise GitHubAPIError(f"GitHub request failed ({response.status_code})")
        return GitHubRepo.from_api(response.json())

    def list_repositories(self) -> list[GitHubRepo]:
        """Repositories the authenticated user owns, collaborates on, or can see through an organization."""
        repos: list[GitHubRepo] = []
        for page in range(1, MAX_REPO_PAGES + 1):
            batch = self._get(
                "/user/repos", per_page=100, page=page, sort="pushed",
                affiliation="owner,collaborator,organization_member",
            )
            repos.extend(GitHubRepo.from_api(item) for item in batch)
            if len(batch) < 100:
                break
        return repos

    def _primary_email(self, user: dict) -> str:
        # The public profile email is often empty; /user/emails (user:email scope) has the verified primary
        try:
            emails = self._get("/user/emails")
        except GitHubAPIError:
            emails = []
        for entry in emails:
            if entry.get("primary") and entry.get("verified"):
                return entry["email"].lower()
        if user.get("email"):
            return user["email"].lower()
        # GitHub's stable noreply address, so accounts without a visible email can still sign in
        return f"{user['id']}+{user['login']}@users.noreply.github.com".lower()
