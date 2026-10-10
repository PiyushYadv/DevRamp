import logging
import os
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.ai.embeddings import EmbeddingQuotaExceededError, GeminiEmbeddingService
from app.ai.pinecone import PineconeVectorStore, get_vector_store as shared_vector_store
from app.config import settings
from app.db.session import open_session
from app.exceptions.github import GitHubAPIError, GitHubOAuthError, GitHubRateLimitError
from app.exceptions.repository import (
    InvalidRepositoryUrlError, RepositoryIngestionError, RepositoryNotFoundError,
    RepositoryNotPublicError, RepositoryTooLargeError,
)
from app.models.repository import Repository
from app.models.user import User
from app.repositories.access_repository import AccessRepository
from app.repositories.repository_repository import RepositoryRepository
from app.schemas.ingestion import SemanticChunk
from app.services.github.client import GitHubClient, GitHubRepo
from app.services.ingestion.chunker import ASTChunker
from app.services.ingestion.embedding import embedding_text, prioritize_chunks, vector_id, vector_metadata
from app.services.ingestion.language import primary_language
from app.services.repository.clone import RepositoryCloner
from app.utils.encryption import decrypt_secret
from app.utils.github_url import GitHubRepoRef, parse_github_url

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = ("queued", "processing")


def get_embedder() -> GeminiEmbeddingService:
    return GeminiEmbeddingService()


def get_vector_store() -> PineconeVectorStore:
    return shared_vector_store()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class IngestionService:
    """
    POST /api/ingest pipeline. Cloning and Tree-sitter parsing run inside the request (seconds) so the file tree
    and code viewer work immediately; embedding + Pinecone upsert run afterwards in `index_repository`, because
    Gemini free-tier rate limits can stretch that to minutes. Progress is exposed via the ingestion status endpoint.
    """

    def __init__(self, db: Session, cloner: RepositoryCloner | None = None):
        self.db = db
        self.repos = RepositoryRepository(db)
        self.access = AccessRepository(db)
        self.cloner = cloner or RepositoryCloner()

    def ingest(self, user: User, repo_url: str) -> tuple[Repository, list[SemanticChunk] | None]:
        """Returns the repository and, when (re)indexing is needed, the chunks to embed in the background."""
        ref = parse_github_url(repo_url)
        if ref is None:
            raise InvalidRepositoryUrlError()

        token = decrypt_secret(user.github_access_token) if user.github_access_token else None
        meta = self._lookup(ref, token)
        if meta is not None and meta.size_kb > settings.MAX_REPO_SIZE_MB * 1024:
            raise RepositoryTooLargeError(f"Repository is larger than {settings.MAX_REPO_SIZE_MB} MB")

        full_name = meta.full_name if meta else ref.full_name
        repo = self.repos.get_by_full_name(full_name)
        if repo is not None and repo.is_private and (meta is None or not meta.private):
            # A private repository is only shared with users whose own GitHub grant can see it
            raise RepositoryNotPublicError()

        access_type = "github" if meta is not None and meta.private else "public"
        created = False
        if repo is None:
            repo, created = self._create(ref, meta)
        self.access.grant(user.id, repo.id, access_type)

        if not created:
            already_indexed = repo.analysis_status == "completed" and repo.indexed and os.path.isdir(self.cloner.repo_path(repo.id))
            if repo.analysis_status in ACTIVE_STATUSES or already_indexed:
                return repo, None  # already indexed or being indexed: the user just joins the workspace
        return repo, self._clone_and_parse(repo, token if access_type == "github" else None)

    def _lookup(self, ref: GitHubRepoRef, token: str | None) -> GitHubRepo | None:
        """GitHub metadata, or None if GitHub can't be asked (rate limit/outage); then only a public clone works."""
        try:
            with GitHubClient(token) as github:
                meta = github.get_repository(ref.owner, ref.name)
        except GitHubOAuthError:
            # Stored token was revoked: fall back to anonymous public access
            return self._lookup(ref, None) if token else None
        except (GitHubRateLimitError, GitHubAPIError):
            logger.warning("GitHub metadata lookup failed for %s; attempting anonymous clone", ref.full_name)
            return None
        if meta is None:
            # GitHub returns 404 for both missing and invisible-private repositories
            raise RepositoryNotFoundError(
                "Repository not found. If it's private, connect GitHub with repository access." if not token
                else "Repository not found or your GitHub account can't access it."
            )
        return meta

    def _create(self, ref: GitHubRepoRef, meta: GitHubRepo | None) -> tuple[Repository, bool]:
        """Returns (repository, created_by_this_request)."""
        fields = {"owner": ref.owner, "name": ref.name, "full_name": ref.full_name, "url": ref.html_url}
        if meta is not None:
            pushed_at = datetime.fromisoformat(meta.pushed_at.replace("Z", "+00:00")) if meta.pushed_at else None
            fields.update(
                owner=meta.owner, name=meta.name, full_name=meta.full_name, url=meta.html_url,
                default_branch=meta.default_branch, is_private=meta.private, language=meta.language,
                github_repo_id=meta.id, description=meta.description, stars=meta.stars, pushed_at=pushed_at,
            )
        try:
            return self.repos.create(**fields, analysis_status="queued", ingestion_stage="queued"), True
        except IntegrityError:
            # Another request created it concurrently; that request owns the ingestion
            self.db.rollback()
            return self.repos.get_by_full_name(fields["full_name"]), False

    def _clone_and_parse(self, repo: Repository, token: str | None) -> list[SemanticChunk]:
        self._set_stage(repo, "cloning", 5, "Cloning repository")
        try:
            path = self.cloner.clone_repo(f"https://github.com/{repo.full_name}.git", repo.id, access_token=token)
            git_meta = self.cloner.get_repo_metadata(path)
        except ValueError as e:
            self._fail(repo, str(e))
            if not repo.is_private and token is None and repo.github_repo_id is None:
                # Metadata lookup was skipped (rate limit), so a failed anonymous clone most likely means private
                raise RepositoryNotPublicError() from e
            raise RepositoryIngestionError(str(e)) from e
        except Exception as e:
            logger.exception("Clone failed for %s", repo.id)
            self._fail(repo, "Failed to clone repository")
            raise RepositoryIngestionError("Failed to clone repository") from e

        self._set_stage(repo, "parsing", 15, "Parsing source files with Tree-sitter")
        try:
            chunks = ASTChunker().extract_chunks(path, repo.id, git_meta["commit_sha"])
        except Exception as e:
            logger.exception("Parsing failed for %s", repo.id)
            self._fail(repo, "Failed to parse repository source files")
            raise RepositoryIngestionError("Failed to parse repository source files") from e
        total_chunks = len(chunks)
        chunks = prioritize_chunks(chunks, settings.MAX_INDEXED_CHUNKS)

        repo.current_commit = git_meta["commit_sha"]
        repo.default_branch = git_meta["default_branch"]
        repo.indexed_paths = sorted({c.path for c in chunks})
        repo.language = repo.language or primary_language(repo.indexed_paths)
        repo.chunk_count = len(chunks)
        repo.last_synced_at = _now()
        repo.analysis_status = "processing"
        repo.ingestion_stage = "embedding"
        repo.ingestion_progress = 20
        skipped = f" (capped from {total_chunks})" if total_chunks > len(chunks) else ""
        repo.ingestion_message = f"Embedding {len(chunks)} code chunks{skipped}"
        self.repos.save(repo)
        return chunks

    def _set_stage(self, repo: Repository, stage: str, progress: int, message: str) -> None:
        repo.analysis_status = "processing"
        repo.ingestion_stage = stage
        repo.ingestion_progress = progress
        repo.ingestion_message = message
        self.repos.save(repo)

    def _fail(self, repo: Repository, message: str) -> None:
        repo.analysis_status = "failed"
        repo.ingestion_stage = "failed"
        repo.ingestion_message = message
        self.repos.save(repo)


async def index_repository(repo_id: str, chunks: list[SemanticChunk]) -> None:
    """Background stage: Gemini embeddings -> Pinecone namespace repo_{repo_id}. Uses its own DB session."""
    db = open_session()
    repos = RepositoryRepository(db)
    try:
        repo = repos.get_by_id(repo_id)
        if repo is None:
            return

        async def on_progress(done: int, total: int) -> None:
            repo.ingestion_progress = 20 + int(70 * done / max(total, 1))
            repo.ingestion_message = f"Embedded {done}/{total} code chunks"
            repos.save(repo)

        embeddings = await get_embedder().embed_documents([embedding_text(c) for c in chunks], on_progress)

        repo.ingestion_stage, repo.ingestion_progress = "indexing", 92
        repo.ingestion_message = "Writing vectors to Pinecone"
        repos.save(repo)
        vectors = [
            {"id": vector_id(c), "values": e, "metadata": vector_metadata(c)}
            for c, e in zip(chunks, embeddings)
        ]
        await get_vector_store().replace_namespace(repo_id, vectors)

        repo.analysis_status = "completed"
        repo.indexed = True
        repo.ingestion_stage, repo.ingestion_progress = "completed", 100
        repo.ingestion_message = f"Indexed {len(vectors)} code chunks"
        repo.last_analyzed_at = _now()
        repos.save(repo)
    except Exception as e:
        logger.exception("Indexing failed for %s", repo_id)
        db.rollback()
        repo = repos.get_by_id(repo_id)
        if repo is not None:
            repo.analysis_status = "failed"
            repo.ingestion_stage = "failed"
            repo.ingestion_message = (
                str(e) if isinstance(e, EmbeddingQuotaExceededError) else "Indexing failed. Please try again."
            )
            repos.save(repo)
    finally:
        db.close()
