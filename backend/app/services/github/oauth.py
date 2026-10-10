from dataclasses import dataclass
import httpx
from app.config import settings
from app.exceptions.github import GitHubAPIError, GitHubNotConfiguredError, GitHubOAuthError

TOKEN_URL = "https://github.com/login/oauth/access_token"


@dataclass
class GitHubToken:
    access_token: str
    scopes: str


def exchange_code_for_token(code: str) -> GitHubToken:
    """Trades the one-time OAuth `code` from the frontend callback for a user access token."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise GitHubNotConfiguredError()

    try:
        response = httpx.post(
            TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as e:
        raise GitHubAPIError("Could not reach GitHub") from e

    data = response.json() if response.status_code == 200 else {}
    # GitHub reports bad/expired/reused codes as 200 with an "error" field
    if "access_token" not in data:
        raise GitHubOAuthError()
    return GitHubToken(access_token=data["access_token"], scopes=data.get("scope", ""))
