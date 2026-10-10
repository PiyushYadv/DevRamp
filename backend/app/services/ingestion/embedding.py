import hashlib
import posixpath
import re
from app.schemas.ingestion import SemanticChunk

MAX_EMBED_CHARS = 6000  # ~1.5k tokens; gemini-embedding-001 accepts up to 2048 input tokens
MAX_METADATA_CONTENT_CHARS = 4000  # Pinecone allows 40KB of metadata per vector
_LOW_PRIORITY_PATH = re.compile(r"(^|/)(tests?|__tests__|spec|examples?|docs?|fixtures?|benchmarks?)(/|$)|(\.|_)(test|spec)\.")


def embedding_text(chunk: SemanticChunk) -> str:
    """Location + symbol header gives the embedding context the raw code lacks (e.g. which file a method is in)."""
    header = [f"File: {chunk.path}", f"Language: {chunk.language}"]
    if chunk.symbol:
        header.append(f"Symbol: {chunk.symbol} ({chunk.node_type})")
    if chunk.part:
        header.append(f"Part {chunk.part} of {chunk.parts}")
    return "\n".join(header) + "\n\n" + chunk.content[:MAX_EMBED_CHARS]


def vector_id(chunk: SemanticChunk) -> str:
    # Deterministic and ASCII-safe regardless of the characters in paths or symbols
    key = f"{chunk.path}:{chunk.start_line}-{chunk.end_line}:{chunk.symbol}:{chunk.part}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def vector_metadata(chunk: SemanticChunk) -> dict:
    metadata = {
        "repoId": chunk.repo_id,
        "path": chunk.path,
        "directory": posixpath.dirname(chunk.path),  # lets chat boost chunks from the open file's package
        "language": chunk.language,
        "nodeType": chunk.node_type,
        "symbol": chunk.symbol or "",  # Pinecone rejects null metadata values
        "startLine": chunk.start_line,
        "endLine": chunk.end_line,
        "commitSha": chunk.commit_sha,
        "contentHash": hashlib.sha256(chunk.content.encode("utf-8")).hexdigest(),
        "content": chunk.content[:MAX_METADATA_CONTENT_CHARS],
    }
    if chunk.part:
        metadata.update(part=chunk.part, parts=chunk.parts)
    return metadata


def prioritize_chunks(chunks: list[SemanticChunk], limit: int) -> list[SemanticChunk]:
    """Keeps at most `limit` chunks, preferring application source over tests, examples and docs."""
    if len(chunks) <= limit:
        return chunks
    ranked = sorted(range(len(chunks)), key=lambda i: (bool(_LOW_PRIORITY_PATH.search(chunks[i].path)), i))
    keep = sorted(ranked[:limit])
    return [chunks[i] for i in keep]
