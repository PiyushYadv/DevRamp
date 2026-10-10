import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base
from app.db.session import get_db
import app.main as main_module
from app.main import app
from app.db import session as db_session_module


@pytest.fixture(autouse=True)
def no_network_warm_up(monkeypatch):
    async def skip():
        return None
    monkeypatch.setattr(main_module, "_warm_up_vector_store", skip)


@pytest.fixture
def session_factory(monkeypatch):
    # One shared in-memory connection per test so every session sees the same tables
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    monkeypatch.setattr(db_session_module, "session_factory", factory)
    yield factory
    engine.dispose()


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
