from fastapi import APIRouter, BackgroundTasks, Query
from app.dependencies import AccessibleRepository, CurrentUser, DbSession
from app.schemas.repository import (
    FileTreeNode, IngestionStatusResponse, IngestRepositoryPayload, IngestRepositoryResponse, RepositoryResponse,
)
from app.services.ingestion.service import IngestionService, index_repository
from app.services.repository.service import RepositoryFileService

router = APIRouter(tags=["ingestion"])

_STATUS_MESSAGES = {
    "queued": "Repository ingestion queued.",
    "processing": "Repository files are ready; semantic indexing is running.",
    "completed": "Repository indexed successfully.",
    "failed": "Repository ingestion failed.",
}


@router.post("/ingest", response_model=IngestRepositoryResponse)
def ingest_repository(payload: IngestRepositoryPayload, user: CurrentUser, db: DbSession, background: BackgroundTasks):
    """
    Clones + parses synchronously (tree and file viewer usable as soon as this returns), then embeds and indexes
    in the background. Poll GET /api/repository/{repoId}/ingestion for progress.
    """
    repo, chunks = IngestionService(db).ingest(user, payload.repoUrl)
    if chunks is not None:
        background.add_task(index_repository, repo.id, chunks)
    return IngestRepositoryResponse(
        repo_id=repo.id,
        status=repo.analysis_status,
        message=repo.ingestion_message if repo.analysis_status == "failed" else _STATUS_MESSAGES[repo.analysis_status],
        repository=RepositoryResponse.model_validate(repo),
    )


@router.post("/repository/{repo_id}/sync", response_model=IngestRepositoryResponse)
def sync_repository(
    repo: AccessibleRepository, user: CurrentUser, db: DbSession, background: BackgroundTasks,
    force: bool = Query(False, description="Re-index even if GitHub's HEAD hasn't moved"),
):
    """Pull the latest commit and re-index if it changed. Poll GET /api/repository/{repoId}/ingestion while processing."""
    repo, chunks = IngestionService(db).sync(user, repo, force)
    if chunks is not None:
        background.add_task(index_repository, repo.id, chunks)
        message = "Re-indexing the latest commit."
    elif repo.analysis_status == "completed":
        message = f"Already up to date at {repo.current_commit[:7]}." if repo.current_commit else "Already up to date."
    else:
        message = _STATUS_MESSAGES[repo.analysis_status]
    return IngestRepositoryResponse(
        repo_id=repo.id, status=repo.analysis_status, message=message,
        repository=RepositoryResponse.model_validate(repo),
    )


@router.get("/repository/{repo_id}/ingestion", response_model=IngestionStatusResponse)
def ingestion_status(repo: AccessibleRepository):
    return IngestionStatusResponse(
        status=repo.analysis_status,
        stage=repo.ingestion_stage,
        progress=repo.ingestion_progress,
        message=repo.ingestion_message,
        chunk_count=repo.chunk_count,
    )


@router.get("/repository/{repo_id}/tree", response_model=list[FileTreeNode], response_model_exclude_none=True)
def repository_tree(repo: AccessibleRepository):
    return RepositoryFileService().tree(repo)


@router.get("/tree", response_model=list[FileTreeNode], response_model_exclude_none=True)
def repository_tree_legacy(repo: AccessibleRepository):
    """GET /api/tree?repo_id=...: route used by the current frontend client."""
    return RepositoryFileService().tree(repo)
