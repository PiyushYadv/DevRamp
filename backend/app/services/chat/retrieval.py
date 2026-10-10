import asyncio
import posixpath
from dataclasses import dataclass
from app.ai.embeddings import GeminiEmbeddingService
from app.ai.pinecone import PineconeVectorStore
from app.exceptions.repository import FileNotFoundInRepositoryError, FileNotTextError, FileTooLargeError
from app.models.repository import Repository
from app.services.repository.service import RepositoryFileService

REPO_TOP_K = 10
FILE_TOP_K = 4
PACKAGE_TOP_K = 4
MAX_CONTEXT_CHUNKS = 8
MIN_OPEN_FILE_CHUNKS = 2
# Relevance boosts: current file > same package > repository-wide (a boost, never a hard filter)
FILE_BOOST = 0.08
PACKAGE_BOOST = 0.04
MAX_SELECTION_LINES = 200
OPEN_FILE_PREVIEW_LINES = 150


@dataclass
class RetrievedChunk:
    path: str
    start_line: int
    end_line: int
    content: str
    symbol: str | None
    score: float
    relevance: str  # "selected" | "current file" | "same package" | "repository"


class RAGRetriever:
    def __init__(self, embedder: GeminiEmbeddingService, store: PineconeVectorStore, files: RepositoryFileService):
        self.embedder = embedder
        self.store = store
        self.files = files

    async def retrieve(
        self, repo: Repository, query: str, file_path: str | None = None,
        start_line: int | None = None, end_line: int | None = None,
    ) -> list[RetrievedChunk]:
        resolved = self.files.resolve(repo, file_path) if file_path else None
        open_file = resolved[0] if resolved else None

        vector = await self.embedder.embed_query(query)
        searches = [self.store.query(repo.id, vector, top_k=REPO_TOP_K)]
        if open_file:
            searches.append(self.store.query(repo.id, vector, top_k=FILE_TOP_K, metadata_filter={"path": {"$eq": open_file}}))
            directory = posixpath.dirname(open_file)
            searches.append(self.store.query(repo.id, vector, top_k=PACKAGE_TOP_K, metadata_filter={
                "$and": [{"directory": {"$eq": directory}}, {"path": {"$ne": open_file}}],
            }))
        results = await asyncio.gather(*searches)

        # Merge all searches; boosts are applied by where a chunk lives, whichever search found it
        merged: dict[str, RetrievedChunk] = {}
        for hits in results:
            for hit in hits:
                if hit["id"] in merged:
                    continue
                meta = hit["metadata"]
                path = meta.get("path", "")
                relevance, boost = "repository", 0.0
                if open_file and path == open_file:
                    relevance, boost = "current file", FILE_BOOST
                elif open_file and posixpath.dirname(path) == posixpath.dirname(open_file):
                    relevance, boost = "same package", PACKAGE_BOOST
                merged[hit["id"]] = RetrievedChunk(
                    path=path,
                    start_line=int(meta.get("startLine", 1)),
                    end_line=int(meta.get("endLine", 1)),
                    content=meta.get("content", ""),
                    symbol=meta.get("symbol") or None,
                    score=hit["score"] + boost,
                    relevance=relevance,
                )

        ranked = sorted(merged.values(), key=lambda c: c.score, reverse=True)
        chunks = ranked[:MAX_CONTEXT_CHUNKS]
        # Guarantee the open file is represented even if repository-wide matches outrank it:
        # swap the lowest-ranked other chunks for the best remaining open-file chunks
        have = sum(1 for c in chunks if c.relevance == "current file")
        extras = [c for c in ranked[MAX_CONTEXT_CHUNKS:] if c.relevance == "current file"][:max(0, MIN_OPEN_FILE_CHUNKS - have)]
        if extras:
            others = [c for c in chunks if c.relevance != "current file"]
            dropped = {id(c) for c in others[len(others) - len(extras):]}
            chunks = [c for c in chunks if id(c) not in dropped] + extras

        pinned = self._pinned_context(repo, open_file, start_line, end_line, has_file_chunks=any(c.relevance == "current file" for c in chunks))
        return pinned + sorted(chunks, key=lambda c: c.score, reverse=True)

    def _pinned_context(
        self, repo: Repository, open_file: str | None, start_line: int | None, end_line: int | None, has_file_chunks: bool,
    ) -> list[RetrievedChunk]:
        """The developer's selected lines, or the head of an open file that isn't indexed (README, config...)."""
        if not open_file:
            return []
        if start_line is None and has_file_chunks:
            return []
        try:
            content = self.files.read_file(repo, open_file)["content"]
        except (FileNotFoundInRepositoryError, FileNotTextError, FileTooLargeError):
            return []

        lines = content.splitlines()
        if start_line is not None:
            first = max(1, start_line)
            last = min(len(lines), end_line or first, first + MAX_SELECTION_LINES - 1)
            relevance = "selected"
        else:
            first, last, relevance = 1, min(len(lines), OPEN_FILE_PREVIEW_LINES), "current file"
        if first > last:
            return []
        return [RetrievedChunk(path=open_file, start_line=first, end_line=last, content="\n".join(lines[first - 1:last]),
                               symbol=None, score=1.0, relevance=relevance)]
