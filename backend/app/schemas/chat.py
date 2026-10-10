from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.base import CamelModel


class ChatContext(BaseModel):
    """Current workspace context; the open file boosts retrieval but never restricts it."""
    repoId: Optional[str] = None
    filePath: Optional[str] = Field(default=None, max_length=1024)
    startLine: Optional[int] = Field(default=None, ge=1)
    endLine: Optional[int] = Field(default=None, ge=1)
    moduleId: Optional[str] = Field(default=None, max_length=200)
    selectedSymbol: Optional[str] = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def line_range_order(self):
        if self.startLine and self.endLine and self.endLine < self.startLine:
            self.endLine = self.startLine
        return self


class ChatStreamRequest(BaseModel):
    repoId: str = Field(min_length=1, max_length=100)
    query: str = Field(min_length=1, max_length=4000)
    context: Optional[ChatContext] = None


class Citation(CamelModel):
    file: str
    line: int
    end_line: Optional[int] = None
    label: str


class ChatMessageResponse(CamelModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: list[Citation] = Field(default_factory=list)
    context: Optional[dict] = None
    created_at: Optional[datetime] = None
