from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_github_id(self, github_id: str) -> User | None:
        stmt = select(User).where(User.github_id == github_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, name: str, email: str, password_hash: str) -> User:
        db_user = User(name=name, email=email.lower(), password_hash=password_hash, auth_provider="password")
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
