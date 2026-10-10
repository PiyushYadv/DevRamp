from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage

HISTORY_LIMIT = 200


class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def history(self, user_id: str, repo_id: str, limit: int = HISTORY_LIMIT) -> list[ChatMessage]:
        """Oldest-first, the most recent `limit` messages."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id, ChatMessage.repo_id == repo_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.role.desc())
            .limit(limit)
        )
        return list(reversed(self.db.execute(stmt).scalars().all()))

    def save_exchange(
        self, user_id: str, repo_id: str, query: str, context: dict | None,
        answer: str, citations: list[dict], assistant_id: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        self.db.add_all([
            ChatMessage(user_id=user_id, repo_id=repo_id, role="user", content=query, context=context, created_at=now),
            # +1µs keeps the pair ordered even on clocks with coarse resolution
            ChatMessage(id=assistant_id, user_id=user_id, repo_id=repo_id, role="assistant", content=answer,
                        citations=citations, created_at=now + timedelta(microseconds=1)),
        ])
        self.db.commit()
