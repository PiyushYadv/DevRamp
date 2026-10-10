import asyncio
import re
from collections.abc import Awaitable, Callable
import httpx
from app.ai.http import gemini_http_client
from app.config import settings

BATCH_SIZE = 100  # batchEmbedContents maximum
MAX_RETRIES = 6
MAX_BACKOFF_SECONDS = 60.0


class EmbeddingError(RuntimeError):
    pass


class EmbeddingQuotaExceededError(EmbeddingError):
    pass


class GeminiEmbeddingService:
    def __init__(
        self,
        api_key: str = settings.GEMINI_API_KEY,
        model: str = settings.GEMINI_EMBEDDING_MODEL,
        dimensions: int = settings.EMBEDDING_DIMENSIONS,
    ):
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions

    async def embed_documents(
        self, texts: list[str], on_progress: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> list[list[float]]:
        """Embeds code chunks for indexing. `on_progress(done, total)` is awaited after each batch."""
        embeddings: list[list[float]] = []
        for start in range(0, len(texts), BATCH_SIZE):
            batch = texts[start:start + BATCH_SIZE]
            embeddings.extend(await self._embed_batch(batch, "RETRIEVAL_DOCUMENT"))
            if on_progress:
                await on_progress(len(embeddings), len(texts))
        return embeddings

    async def embed_query(self, text: str) -> list[float]:
        (embedding,) = await self._embed_batch([text], "RETRIEVAL_QUERY")
        return embedding

    async def _embed_batch(self, texts: list[str], task_type: str) -> list[list[float]]:
        payload = {
            "requests": [
                {
                    "model": f"models/{self.model}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": task_type,
                    "outputDimensionality": self.dimensions,
                }
                for text in texts
            ]
        }
        client = gemini_http_client()
        url = f"/models/{self.model}:batchEmbedContents"

        for attempt in range(MAX_RETRIES + 1):
            try:
                # Key in a header rather than the query string so it never appears in logged URLs
                response = await client.post(url, json=payload, headers={"x-goog-api-key": self.api_key})
            except httpx.HTTPError as e:
                if attempt == MAX_RETRIES:
                    raise EmbeddingError(f"Gemini embedding request failed: {e}") from e
                await asyncio.sleep(_backoff(attempt))
                continue

            if response.status_code == 200:
                vectors = [item["values"] for item in response.json().get("embeddings", [])]
                if len(vectors) != len(texts):
                    raise EmbeddingError(f"Gemini returned {len(vectors)} embeddings for {len(texts)} inputs")
                return vectors

            if response.status_code == 429 and "PerDay" in response.text:
                raise EmbeddingQuotaExceededError("Gemini daily embedding quota exhausted; try again tomorrow")
            if response.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                await asyncio.sleep(_retry_delay(response) or _backoff(attempt))
                continue
            raise EmbeddingError(f"Gemini embedding error {response.status_code}: {response.text[:300]}")

        raise EmbeddingError("Gemini embedding retries exhausted")


def _backoff(attempt: int) -> float:
    return min(MAX_BACKOFF_SECONDS, 2.0 * 2 ** attempt)


def _retry_delay(response: httpx.Response) -> float | None:
    """Gemini 429s carry a google.rpc.RetryInfo detail like {"retryDelay": "34s"}."""
    match = re.search(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"', response.text)
    return min(MAX_BACKOFF_SECONDS, float(match.group(1)) + 1.0) if match else None
