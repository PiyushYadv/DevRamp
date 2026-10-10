from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.models.repository import Repository
from app.models.repository_access import GitHubRepositorySelection, UserRepositoryAccess


class AccessRepository:
    def __init__(self, db: Session):
        self.db = db

    def has_access(self, user_id: str, repo_id: str) -> bool:
        return self.db.get(UserRepositoryAccess, (user_id, repo_id)) is not None

    def grant(self, user_id: str, repo_id: str, access_type: str) -> None:
        if not self.has_access(user_id, repo_id):
            self.db.add(UserRepositoryAccess(user_id=user_id, repo_id=repo_id, access_type=access_type))
            self.db.commit()

    def list_repositories(self, user_id: str) -> list[Repository]:
        """Repositories in the user's DevRamp workspace, most recently added first."""
        stmt = (
            select(Repository)
            .join(UserRepositoryAccess, UserRepositoryAccess.repo_id == Repository.id)
            .where(UserRepositoryAccess.user_id == user_id)
            .order_by(UserRepositoryAccess.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars())

    def get_github_selection(self, user_id: str) -> set[str]:
        stmt = select(GitHubRepositorySelection.github_repo_id).where(GitHubRepositorySelection.user_id == user_id)
        return set(self.db.execute(stmt).scalars())

    def set_github_selection(self, user_id: str, github_repo_ids: list[str]) -> None:
        self.db.execute(delete(GitHubRepositorySelection).where(GitHubRepositorySelection.user_id == user_id))
        self.db.add_all(GitHubRepositorySelection(user_id=user_id, github_repo_id=gid) for gid in dict.fromkeys(github_repo_ids))
        self.db.commit()
