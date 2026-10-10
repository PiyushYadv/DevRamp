import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import engine, Base
from app.db.session import open_session
from app import models  # noqa: F401  registers tables on Base.metadata
from app.ai.http import close_gemini_http_client
from app.ai.pinecone import close_vector_store, get_vector_store
from app.api import analysis, auth, chat, github, ingestion, onboarding, repositories
from app.repositories.repository_repository import RepositoryRepository
from app.utils.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Create tables for Phase 1
Base.metadata.create_all(bind=engine)


async def _warm_up_vector_store() -> None:
    try:
        await get_vector_store().warm_up()
    except Exception:
        # Non-fatal: the first query will connect instead
        logging.getLogger(__name__).warning("Pinecone warm-up failed", exc_info=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    with open_session() as db:
        interrupted = RepositoryRepository(db).fail_interrupted_ingestions()
    if interrupted:
        logging.getLogger(__name__).warning("Marked %d interrupted ingestion(s) as failed", interrupted)
    warm_up = asyncio.create_task(_warm_up_vector_store())
    yield
    warm_up.cancel()
    await close_vector_store()
    await close_gemini_http_client()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

for router in (
    auth.router, chat.router, github.router, ingestion.router, repositories.router, analysis.router, onboarding.router,
):
    app.include_router(router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok"}
