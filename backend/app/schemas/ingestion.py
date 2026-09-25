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