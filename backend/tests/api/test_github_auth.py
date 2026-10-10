import pytest
from app.exceptions.github import GitHubOAuthError
from app.models.user import User
from app.services.auth import service as auth_service
from app.services.github.client import GitHubProfile
from app.services.github.oauth import GitHubToken
from app.utils.encryption import decrypt_secret

PROFILES = {
    "code-octo": GitHubProfile(id="583231", login="octocat", name="The Octocat",
                               html_url="https://github.com/octocat", email="octocat@github.com"),
    "code-alex": GitHubProfile(id="999", login="alexchen", name="Alex Chen",
                               html_url="https://github.com/alexchen", email="alex@example.com"),
}


@pytest.fixture(autouse=True)
def fake_github(monkeypatch):
    """Each OAuth code maps to a profile; unknown codes behave like GitHub's bad_verification_code."""

    def exchange(code):
        if code not in PROFILES:
            raise GitHubOAuthError()
        return GitHubToken(access_token=f"gho_token_for_{code}", scopes="read:user,user:email")

    class FakeClient:
        def __init__(self, token):
            self.code = token.removeprefix("gho_token_for_")

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            pass

        def get_profile(self):
            return PROFILES[self.code]

    monkeypatch.setattr(auth_service, "exchange_code_for_token", exchange)
    monkeypatch.setattr(auth_service, "GitHubClient", FakeClient)


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_github_login_creates_user_and_stores_encrypted_token(client, db_session):
    res = client.post("/api/auth/github", json={"code": "code-octo"})

    assert res.status_code == 200
    user = res.json()["user"]
    assert user == {"id": user["id"], "name": "The Octocat", "email": "octocat@github.com",
                    "githubUrl": "https://github.com/octocat", "authProvider": "github"}

    stored = db_session.get(User, user["id"])
    assert stored.github_id == "583231" and stored.password_hash is None
    assert stored.github_access_token != "gho_token_for_code-octo"  # not plaintext
    assert decrypt_secret(stored.github_access_token) == "gho_token_for_code-octo"


def test_github_login_twice_returns_same_user(client):
    first = client.post("/api/auth/github", json={"code": "code-octo"}).json()["user"]["id"]
    second = client.post("/api/auth/github", json={"code": "code-octo"}).json()["user"]["id"]

    assert first == second


def test_github_login_does_not_auto_link_password_account_with_same_email(client):
    client.post("/api/auth/signup", json={"name": "Alex", "email": "alex@example.com", "password": "password123"})
    res = client.post("/api/auth/github", json={"code": "code-alex"})

    assert res.status_code == 409
    assert res.json()["code"] == "EMAIL_REGISTERED_WITH_PASSWORD"


def test_connect_links_github_then_github_login_reaches_same_account(client):
    signup = client.post("/api/auth/signup", json={"name": "Alex", "email": "alex@example.com", "password": "password123"}).json()
    res = client.post("/api/auth/github/connect", json={"code": "code-alex"}, headers=bearer(signup["accessToken"]))

    assert res.status_code == 200
    assert res.json()["user"]["githubUrl"] == "https://github.com/alexchen"
    via_github = client.post("/api/auth/github", json={"code": "code-alex"}).json()
    assert via_github["user"]["id"] == signup["user"]["id"]


def test_connect_rejects_github_account_owned_by_another_user(client):
    client.post("/api/auth/github", json={"code": "code-octo"})
    other = client.post("/api/auth/signup", json={"name": "B", "email": "b@example.com", "password": "password123"}).json()
    res = client.post("/api/auth/github/connect", json={"code": "code-octo"}, headers=bearer(other["accessToken"]))

    assert res.status_code == 409
    assert res.json()["code"] == "GITHUB_ACCOUNT_LINKED"


def test_connect_requires_authentication(client):
    assert client.post("/api/auth/github/connect", json={"code": "code-octo"}).status_code == 401


def test_invalid_code_is_400(client):
    res = client.post("/api/auth/github", json={"code": "expired"})

    assert res.status_code == 400
    assert res.json()["code"] == "GITHUB_OAUTH_FAILED"


def test_github_only_user_cannot_password_login(client):
    client.post("/api/auth/github", json={"code": "code-octo"})
    res = client.post("/api/auth/login", json={"email": "octocat@github.com", "password": "anything"})

    assert res.status_code == 401
