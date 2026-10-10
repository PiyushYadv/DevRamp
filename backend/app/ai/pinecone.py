import asyncio
from typing import Any
from pinecone import PineconeAsyncio
from pinecone.exceptions import NotFoundException
from app.config import settings

UPSERT_BATCH_SIZE = 100


def namespace_for(repo_id: str) -> str:
    # Every repository is isolated in its own namespace so retrieval can never cross repositories
    return f"repo_{repo_id}"


class PineconeVectorStore:
    """
    Async Pinecone data-plane client. The connection is opened once and reused: a fresh client per query costs
    a control-plane lookup plus a TLS handshake (~1-2s), a warm one answers in tens of milliseconds.
    """

    def __init__(self, api_key: str = settings.PINECONE_API_KEY, index_name: str = settings.PINECONE_INDEX_NAME):
        self.api_key = api_key
        self.index_name = index_name
        self._pc: PineconeAsyncio | None = None
        self._index = None
        self._lock = asyncio.Lock()

    async def _get_index(self):
        if self._index is None:
            async with self._lock:
                if self._index is None:
                    self._pc = PineconeAsyncio(api_key=self.api_key)
                    host = (await self._pc.describe_index(self.index_name)).host
                    self._index = self._pc.IndexAsyncio(host=host)
        return self._index

    async def warm_up(self) -> None:
        """Resolve the index host and open the connection ahead of the first chat request (~2s cold)."""
        index = await self._get_index()
        await index.describe_index_stats()

    async def aclose(self) -> None:
        if self._index is not None:
            await self._index.close()
        if self._pc is not None:
            await self._pc.close()
        self._index = self._pc = None

    async def replace_namespace(self, repo_id: str, vectors: list[dict[str, Any]]) -> None:
        """Drops the repository's previous vectors, then upserts the new set."""
        index = await self._get_index()
        namespace = namespace_for(repo_id)
        try:
            await index.delete(delete_all=True, namespace=namespace)
        except NotFoundException:
            pass  # first ingestion: namespace doesn't exist yet
        for start in range(0, len(vectors), UPSERT_BATCH_SIZE):
            await index.upsert(vectors=vectors[start:start + UPSERT_BATCH_SIZE], namespace=namespace,
                               show_progress=False)

    async def delete_namespace(self, repo_id: str) -> None:
        index = await self._get_index()
        try:
            await index.delete(delete_all=True, namespace=namespace_for(repo_id))
        except NotFoundException:
            pass

    async def query(
        self, repo_id: str, vector: list[float], top_k: int = 8, metadata_filter: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Returns [{"id", "score", "metadata"}] best-first, scoped to the repository's namespace."""
        index = await self._get_index()
        try:
            result = await index.query(
                vector=vector, top_k=top_k, namespace=namespace_for(repo_id),
                filter=metadata_filter, include_metadata=True,
            )
        except NotFoundException:
            return []
        return [{"id": m.id, "score": m.score, "metadata": dict(m.metadata or {})} for m in result.matches]


_store: PineconeVectorStore | None = None


def get_vector_store() -> PineconeVectorStore:
    global _store
    if _store is None:
        _store = PineconeVectorStore()
    return _store


async def close_vector_store() -> None:
    global _store
    if _store is not None:
        await _store.aclose()
        _store = None
