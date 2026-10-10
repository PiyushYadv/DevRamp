from sqlalchemy.orm import Session
from app.db.database import SessionLocal

# Work that outlives a request (background indexing, SSE streams) opens its own sessions through this;
# tests point it at their in-memory engine.
session_factory = SessionLocal


def open_session() -> Session:
    return session_factory()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
