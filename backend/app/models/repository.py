from sqlalchemy import JSON, String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from typing import List, Optional
from datetime import datetime, timezone
import uuid

def generate_repo_id() -> str:
    return f"repo_{uuid.uuid4().hex[:12]}"

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_repo_id)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    default_branch: Mapped[str] = mapped_column(String, default="main")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # GitHub metadata shown on repository cards
    github_repo_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    pushed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    indexed: Mapped[bool] = mapped_column(Boolean, default=False)
    analysis_status: Mapped[str] = mapped_column(String, default="queued")  # queued | processing | completed | failed
    current_commit: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Ingestion progress for GET /api/repository/{id}/ingestion
    ingestion_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ingestion_progress: Mapped[int] = mapped_column(Integer, default=0)
    ingestion_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    # Repository-relative paths that produced at least one indexed chunk (drives FileTreeNode.indexed)
    indexed_paths: Mapped[list[str]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    users: Mapped[List["UserRepositoryAccess"]] = relationship(back_populates="repository")

    @property
    def indexed_file_count(self) -> int:
        return len(self.indexed_paths or [])
