from fastapi import APIRouter, Query
from app.dependencies import AccessibleRepository, CurrentUser, DbSession
from app.repositories.access_repository import AccessRepository
from app.schemas.repository import FileContentResponse, RepositoryResponse
from app.services.repository.service import RepositoryFileService

router = APIRouter(tags=["repositories"])


@router.get("/repositories", response_model=list[RepositoryResponse])
def list_repositories(user: CurrentUser, db: DbSession):
    """Repositories in the user's DevRamp workspace (repository switcher)."""
    return AccessRepository(db).list_repositories(user.id)


@router.get("/repository/{repo_id}", response_model=RepositoryResponse)
def get_repository(repo: AccessibleRepository):
    return repo


@router.get("/repository/{repo_id}/file", response_model=FileContentResponse)
def get_file(repo: AccessibleRepository, path: str = Query(min_length=1, max_length=1024)):
    return RepositoryFileService().read_file(repo, path)
