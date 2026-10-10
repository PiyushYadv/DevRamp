from typing import Annotated
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.exceptions.auth import InvalidTokenError, NotAuthenticatedError
from app.exceptions.repository import RepositoryNotFoundError
from app.models.repository import Repository
from app.models.user import User
from app.repositories.access_repository import AccessRepository
from app.repositories.repository_repository import RepositoryRepository
from app.repositories.user_repository import UserRepository
from app.services.auth.jwt import decode_access_token

# auto_error=False so a missing header goes through our 401 + error-code format instead of FastAPI's 403
_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise NotAuthenticatedError()
    user = UserRepository(db).get_by_id(decode_access_token(credentials.credentials))
    if user is None:
        raise InvalidTokenError()  # token for a deleted user
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_user_repository(repo_id: str, user: CurrentUser, db: DbSession) -> Repository:
    """Resolves `repo_id` (path or query) to a repository the current user has in their workspace."""
    # Same 404 whether the repository doesn't exist or belongs to someone else, so IDs can't be probed
    if not AccessRepository(db).has_access(user.id, repo_id):
        raise RepositoryNotFoundError()
    repo = RepositoryRepository(db).get_by_id(repo_id)
    if repo is None:
        raise RepositoryNotFoundError()
    return repo


AccessibleRepository = Annotated[Repository, Depends(get_user_repository)]
