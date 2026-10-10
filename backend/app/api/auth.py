from fastapi import APIRouter, status
from app.dependencies import CurrentUser, DbSession
from app.schemas.auth import AuthResponse, GitHubCodePayload, LoginPayload, SignupPayload, UserResponse
from app.services.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupPayload, db: DbSession):
    return AuthService(db).signup(payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginPayload, db: DbSession):
    return AuthService(db).login(payload)


@router.post("/github", response_model=AuthResponse)
def github_login(payload: GitHubCodePayload, db: DbSession):
    """Exchange the OAuth `code` from the frontend callback for a DevRamp session."""
    return AuthService(db).github_login(payload.code)


@router.post("/github/connect", response_model=AuthResponse)
def github_connect(payload: GitHubCodePayload, user: CurrentUser, db: DbSession):
    """Link a GitHub account to the signed-in user (needed to list their repositories)."""
    return AuthService(db).github_connect(user, payload.code)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return user
