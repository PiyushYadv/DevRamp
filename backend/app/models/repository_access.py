from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class UserRepositoryAccess(Base):
    __tablename__ = "user_repository_access"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repositories.id"), primary_key=True)
    
    access_type: Mapped[str] = mapped_column(String, default="public")

    user: Mapped["User"] = relationship(back_populates="repositories")
    repository: Mapped["Repository"] = relationship(back_populates="users")