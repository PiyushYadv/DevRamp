import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from app.ai.llm import ChatTurn, GeminiChatClient, LLMError
from app.ai.prompts.chat import SYSTEM_PROMPT, build_user_turn, format_excerpt
from app.db.session import open_session
from app.models.chat import generate_message_id
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ChatContext
from app.services.chat.citations import CitationExtractor
from app.services.chat.retrieval import RAGRetriever
from app.services.repository.service import RepositoryFileService

logger = logging.getLogger(__name__)

HISTORY_TURNS = 6  # previous messages sent to the model for follow-up questions


@dataclass
class RepoSnapshot:
    """Plain copy of the repository row: the stream outlives the request's DB session."""
    id: str
    full_name: str
    description: str | None
    language: str | None
    indexed_paths: list[str] = field(default_factory=list)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class ChatStreamer:
    def __init__(self, retriever: RAGRetriever, llm: GeminiChatClient, files: RepositoryFileService):
        self.retriever = retriever
        self.llm = llm
        self.files = files

    async def stream(self, user_id: str, repo: RepoSnapshot, query: str, context: ChatContext | None) -> AsyncIterator[str]:
        """
        SSE events: `token` {text} as the model streams, `citation` {file, line, endLine?, label} as soon as a
        complete citation token appears, then `done` {messageId}; or `error` {code, message}.
        """
        file_path = context.filePath if context else None
        started = time.perf_counter()
        try:
            # History comes from SQLite while retrieval waits on Gemini + Pinecone; run them concurrently
            chunks, history = await asyncio.gather(
                self.retriever.retrieve(
                    repo, query, file_path, context.startLine if context else None, context.endLine if context else None,
                ),
                asyncio.to_thread(self._history_turns, user_id, repo.id),
            )
        except Exception:
            logger.exception("Retrieval failed for %s", repo.id)
            yield sse("error", {"code": "CHAT_RETRIEVAL_FAILED", "message": "Couldn't search the repository. Please try again."})
            return

        retrieved_at = time.perf_counter()
        excerpts = [format_excerpt(c.path, c.start_line, c.content, c.relevance, c.symbol) for c in chunks]
        summary = repo.full_name + (f" ({repo.language})" if repo.language else "") + (f": {repo.description}" if repo.description else "")
        open_file = next((c.path for c in chunks if c.relevance in ("selected", "current file")), None)
        turns = history + [ChatTurn("user", build_user_turn(query, excerpts, open_file, summary))]

        known_paths = set(repo.indexed_paths) | {c.path for c in chunks}
        extractor = CitationExtractor(lambda p: p in known_paths or self.files.resolve(repo, p) is not None)
        message_id = generate_message_id()
        failed = False
        first_token_at = None
        try:
            async for delta in self.llm.stream(SYSTEM_PROMPT.format(repo_name=repo.full_name), turns):
                if first_token_at is None:
                    first_token_at = time.perf_counter()
                    logger.info("chat %s: retrieval %.0fms (%d chunks), first token %.0fms", repo.id,
                                (retrieved_at - started) * 1000, len(chunks), (first_token_at - started) * 1000)
                yield sse("token", {"text": delta})
                for citation in extractor.feed(delta):
                    yield sse("citation", citation)
        except LLMError as e:
            failed = True
            yield sse("error", {"code": e.code, "message": e.message})
            return
        finally:
            # Also runs when the client disconnects mid-stream (the partial answer is kept). Synchronous on
            # purpose: awaiting inside a cancelled scope would be cancelled again before the write happened.
            if not failed and extractor.text.strip():
                self._save(user_id, repo.id, query, context, extractor, message_id)

        yield sse("done", {"messageId": message_id})

    @staticmethod
    def _history_turns(user_id: str, repo_id: str) -> list[ChatTurn]:
        with open_session() as db:
            messages = ChatRepository(db).history(user_id, repo_id, limit=HISTORY_TURNS)
        turns = [ChatTurn("model" if m.role == "assistant" else "user", m.content) for m in messages]
        while turns and turns[0].role != "user":  # Gemini expects the conversation to open with a user turn
            turns.pop(0)
        return turns

    @staticmethod
    def _save(user_id: str, repo_id: str, query: str, context: ChatContext | None,
              extractor: CitationExtractor, message_id: str) -> None:
        try:
            with open_session() as db:
                ChatRepository(db).save_exchange(
                    user_id, repo_id, query, context.model_dump(exclude_none=True) if context else None,
                    extractor.text, extractor.citations, message_id,
                )
        except Exception:
            logger.exception("Failed to persist chat exchange for %s", repo_id)
