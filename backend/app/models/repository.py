from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from typing import List, Optional
from datetime import datetime
import uuid

def generate_repo_id() -> str:
    return f"repo_{uuid.uuid4().hex[:12]}"

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
    
    indexed: Mapped[bool] = mapped_column(Boolean, default=False)
    analysis_status: Mapped[str] = mapped_column(String, default="queued")
    current_commit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    users: Mapped[List["UserRepositoryAccess"]] = relationship(back_populates="repository")