import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


def generate_message_id() -> str:
    return f"msg_{uuid.uuid4().hex[:12]}"


class ChatMessage(Base):
    """Chat history belongs to user + repository."""
    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_user_repo_created", "user_id", "repo_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_message_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repositories.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
