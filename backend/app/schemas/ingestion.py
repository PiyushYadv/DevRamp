from pydantic import BaseModel
from typing import Optional

class SemanticChunk(BaseModel):
    repo_id: str
    path: str
    language: str
    node_type: str
    symbol: Optional[str] = None
    start_line: int
    end_line: int
    content: str
    commit_sha: str
    # Set when an oversized definition is split: 1-based part index and total parts
    part: Optional[int] = None
    parts: Optional[int] = None