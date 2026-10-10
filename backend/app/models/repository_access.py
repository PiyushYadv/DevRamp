from datetime import datetime, timezone
from sqlalchemy import DateTime, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class UserRepositoryAccess(Base):
    """A DevRamp user's workspace for an ingested repository (repositories are shared, access is per user)."""
    __tablename__ = "user_repository_access"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repositories.id"), primary_key=True)

    access_type: Mapped[str] = mapped_column(String, default="public")  # public | github
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship(back_populates="repositories")
    repository: Mapped["Repository"] = relationship(back_populates="users")


class GitHubRepositorySelection(Base):
    """GitHub repositories a user chose to expose in DevRamp (POST /api/github/repositories/access)."""
    __tablename__ = "github_repository_selections"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    github_repo_id: Mapped[str] = mapped_column(String, primary_key=True)
