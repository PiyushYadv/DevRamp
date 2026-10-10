from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.models.repository import Repository


class RepositoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, repo_id: str) -> Repository | None:
        return self.db.get(Repository, repo_id)

    def get_by_full_name(self, full_name: str) -> Repository | None:
        # GitHub owner/repo names are case-insensitive; store and look up lower-cased
        stmt = select(Repository).where(Repository.full_name == full_name.lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_full_names(self, full_names: list[str]) -> list[Repository]:
        if not full_names:
            return []
        stmt = select(Repository).where(Repository.full_name.in_([n.lower() for n in full_names]))
        return list(self.db.execute(stmt).scalars())

    def create(self, **fields) -> Repository:
        fields["full_name"] = fields["full_name"].lower()
        db_repo = Repository(**fields)
        self.db.add(db_repo)
        self.db.commit()
        self.db.refresh(db_repo)
        return db_repo

    def save(self, repo: Repository) -> Repository:
        self.db.add(repo)
        self.db.commit()
        self.db.refresh(repo)
        return repo

    def fail_interrupted_ingestions(self) -> int:
        """Ingestion runs in-process; anything still running at startup was interrupted by a restart."""
        result = self.db.execute(
            update(Repository)
            .where(Repository.analysis_status.in_(["queued", "processing"]))
            .values(analysis_status="failed", ingestion_stage="failed",
                    ingestion_message="Ingestion was interrupted by a server restart. Please re-ingest.")
        )
        self.db.commit()
        return result.rowcount
