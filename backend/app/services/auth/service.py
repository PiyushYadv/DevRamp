from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.exceptions.auth import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.exceptions.github import GitHubAccountAlreadyLinkedError, GitHubEmailRegisteredError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, LoginPayload, SignupPayload, UserResponse
from app.services.auth.jwt import create_access_token
from app.services.auth.password import hash_password, verify_password
from app.services.github.client import GitHubClient, GitHubProfile
from app.services.github.oauth import GitHubToken, exchange_code_for_token
from app.utils.encryption import encrypt_secret


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def signup(self, payload: SignupPayload) -> AuthResponse:
        if self.users.get_by_email(payload.email):
            raise EmailAlreadyRegisteredError()
        try:
            user = self.users.create(payload.name, payload.email, hash_password(payload.password))
        except IntegrityError as e:
            # Concurrent signup with the same email slipped past the check above
            self.db.rollback()
            raise EmailAlreadyRegisteredError() from e
        return self._auth_response(user)

    def login(self, payload: LoginPayload) -> AuthResponse:
        user = self.users.get_by_email(payload.email)
        # Always run a bcrypt check (dummy hash when user is missing) so timing doesn't leak which emails exist
        if not verify_password(payload.password, user.password_hash if user else None) or user is None:
            raise InvalidCredentialsError()
        return self._auth_response(user)

    def github_login(self, code: str) -> AuthResponse:
        """Sign in (or sign up) with GitHub."""
        token, profile = self._authorize_github(code)

        user = self.users.get_by_github_id(profile.id)
        if user is None:
            if self.users.get_by_email(profile.email):
                # Password signups don't verify email ownership, so auto-linking by email would let anyone who
                # pre-registered this address take over the GitHub user's workspace. Require an explicit connect.
                raise GitHubEmailRegisteredError()
            # Not committed yet: _link_github persists the user and GitHub fields in a single commit
            user = User(name=profile.name, email=profile.email, password_hash=None, auth_provider="github")

        self._link_github(user, profile, token)
        return self._auth_response(user)

    def github_connect(self, user: User, code: str) -> AuthResponse:
        """Link GitHub to an already signed-in account."""
        token, profile = self._authorize_github(code)

        owner = self.users.get_by_github_id(profile.id)
        if owner is not None and owner.id != user.id:
            raise GitHubAccountAlreadyLinkedError()

        self._link_github(user, profile, token)
        return self._auth_response(user)

    @staticmethod
    def _authorize_github(code: str) -> tuple[GitHubToken, GitHubProfile]:
        token = exchange_code_for_token(code)
        with GitHubClient(token.access_token) as github:
            return token, github.get_profile()

    def _link_github(self, user: User, profile: GitHubProfile, token: GitHubToken) -> None:
        user.github_id = profile.id
        user.github_login = profile.login
        user.github_url = profile.html_url
        user.github_access_token = encrypt_secret(token.access_token)
        user.github_scopes = token.scopes
        try:
            self.users.save(user)
        except IntegrityError as e:
            # Same GitHub account linked concurrently by another user
            self.db.rollback()
            raise GitHubAccountAlreadyLinkedError() from e

    @staticmethod
    def _auth_response(user: User) -> AuthResponse:
        return AuthResponse(user=UserResponse.model_validate(user), access_token=create_access_token(user.id))
