from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import settings

SIGNUP = {"name": "Alex Chen", "email": "Alex@Example.com", "password": "correct-horse"}


def signup(client, **overrides):
    return client.post("/api/auth/signup", json={**SIGNUP, **overrides})


def test_signup_returns_frontend_auth_shape(client):
    res = signup(client)

    assert res.status_code == 201
    body = res.json()
    assert set(body) == {"user", "accessToken"}
    assert body["user"]["id"].startswith("user_")
    assert body["user"]["name"] == "Alex Chen"
    assert body["user"]["email"] == "alex@example.com"  # normalized
    assert body["user"]["authProvider"] == "password"
    assert set(body["user"]) == {"id", "name", "email", "githubUrl", "authProvider"}  # no password hash


def test_signup_duplicate_email_is_409_case_insensitive(client):
    signup(client)
    res = signup(client, email="ALEX@example.com")

    assert res.status_code == 409
    assert res.json()["code"] == "EMAIL_ALREADY_REGISTERED"


def test_signup_validation_errors_use_contract_shape(client):
    res = signup(client, password="short")

    assert res.status_code == 422
    body = res.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["detail"].startswith("password:")


def test_signup_rejects_password_over_bcrypt_limit(client):
    assert signup(client, password="x" * 73).status_code == 422


def test_login_success_and_token_works_on_me(client):
    signup(client)
    res = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "correct-horse"})

    assert res.status_code == 200
    token = res.json()["accessToken"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alex@example.com"


def test_login_wrong_password_and_unknown_email_are_indistinguishable(client):
    signup(client)
    wrong = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "nope-nope"})
    unknown = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Incorrect email or password", "code": "INVALID_CREDENTIALS"}


def test_me_requires_token(client):
    res = client.get("/api/auth/me")

    assert res.status_code == 401
    assert res.json()["code"] == "NOT_AUTHENTICATED"
    assert res.headers["www-authenticate"] == "Bearer"


def test_me_rejects_tampered_expired_and_foreign_tokens(client):
    user_id = signup(client).json()["user"]["id"]
    now = datetime.now(timezone.utc)
    expired = jwt.encode({"sub": user_id, "type": "access", "exp": now - timedelta(minutes=1)},
                         settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    wrong_key = jwt.encode({"sub": user_id, "type": "access", "exp": now + timedelta(hours=1)},
                           "not-the-secret", algorithm="HS256")
    unknown_user = jwt.encode({"sub": "user_missing", "type": "access", "exp": now + timedelta(hours=1)},
                              settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    for token in (expired, wrong_key, unknown_user, "garbage"):
        res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401, token
        assert res.json()["code"] == "INVALID_TOKEN"


def test_unknown_route_uses_contract_error_shape(client):
    res = client.get("/api/does-not-exist")

    assert res.status_code == 404
    assert res.json() == {"detail": "Not Found", "code": "NOT_FOUND"}
