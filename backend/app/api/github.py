from fastapi import APIRouter
from app.dependencies import CurrentUser, DbSession
from app.schemas.repository import GitHubRepositoryResponse, RepositoryAccessPayload, RepositoryAccessResponse
from app.services.github.repositories import GitHubRepositoryService

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/repositories", response_model=list[GitHubRepositoryResponse])
def list_github_repositories(user: CurrentUser, db: DbSession):
    """Repositories visible through the user's connected GitHub account, with DevRamp state."""
    return GitHubRepositoryService(db).list_for_user(user)


@router.post("/repositories/access", response_model=RepositoryAccessResponse)
def set_repository_access(payload: RepositoryAccessPayload, user: CurrentUser, db: DbSession):
    """Persist which GitHub repositories the user chose to use inside DevRamp."""
    return RepositoryAccessResponse(repository_ids=GitHubRepositoryService(db).set_access(user, payload.repositoryIds))
