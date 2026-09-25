from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.repository import Repository
from app.schemas.repository import RepositoryCreate

class RepositoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, repo_id: str) -> Repository | None:
        stmt = select(Repository).where(Repository.id == repo_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_full_name(self, full_name: str) -> Repository | None:
        stmt = select(Repository).where(Repository.full_name == full_name)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, repo_in: RepositoryCreate) -> Repository:
        db_repo = Repository(
            owner=repo_in.owner,
            name=repo_in.name,
            full_name=repo_in.full_name,
            url=repo_in.url,
            default_branch=repo_in.default_branch,
            is_private=repo_in.is_private,
            language=repo_in.language
        )
        self.db.add(db_repo)
        self.db.commit()
        self.db.refresh(db_repo)
        return db_repo