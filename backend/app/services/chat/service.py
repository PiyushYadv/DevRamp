from sqlalchemy.orm import Session
from app.ai.embeddings import GeminiEmbeddingService
from app.ai.llm import GeminiChatClient
from app.ai.pinecone import get_vector_store
from app.exceptions.chat import RepositoryNotIndexedError
from app.models.repository import Repository
from app.repositories.chat_repository import ChatRepository
from app.services.chat.retrieval import RAGRetriever
from app.services.chat.streaming import ChatStreamer, RepoSnapshot
from app.services.repository.service import RepositoryFileService


def build_streamer() -> ChatStreamer:
    files = RepositoryFileService()
    return ChatStreamer(RAGRetriever(GeminiEmbeddingService(), get_vector_store(), files), GeminiChatClient(), files)


def snapshot_for_chat(repo: Repository) -> RepoSnapshot:
    if not repo.indexed:
        progress = f" ({repo.ingestion_progress}%)" if repo.analysis_status == "processing" else ""
        raise RepositoryNotIndexedError(
            f"Repository indexing is still running{progress}. Chat will be available when it completes."
            if repo.analysis_status in ("queued", "processing")
            else "Repository isn't indexed. Re-ingest it to enable chat."
        )
    return RepoSnapshot(repo.id, repo.full_name, repo.description, repo.language, list(repo.indexed_paths or []))


def chat_history(db: Session, user_id: str, repo: Repository) -> list[dict]:
    messages = ChatRepository(db).history(user_id, repo.id)
    if messages:
        return [
            {"id": m.id, "role": m.role, "content": m.content, "citations": m.citations or [],
             "context": m.context, "created_at": m.created_at}
            for m in messages
        ]
    # Not persisted: an opening message so a new workspace isn't an empty panel
    if repo.indexed:
        files = len(repo.indexed_paths or [])
        intro = (f"I've indexed **{repo.full_name}**: {repo.chunk_count} code units across {files} files. "
                 "Ask me about the architecture, a specific flow, or where to start.")
    else:
        intro = f"I'm still indexing **{repo.full_name}**. You can browse files meanwhile; chat unlocks when indexing completes."
    return [{"id": "welcome", "role": "assistant", "content": intro, "citations": [], "context": None, "created_at": None}]
