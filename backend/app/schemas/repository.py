from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.base import CamelModel

AnalysisStatus = Literal["queued", "processing", "completed", "failed"]


class OnboardingProgress(CamelModel):
    completed: int = 0
    total: int = 0
    percentage: int = 0


class RepositoryResponse(CamelModel):
    id: str
    owner: str
    name: str
    full_name: str
    url: str
    default_branch: str
    private: bool = Field(validation_alias="is_private")
    language: Optional[str] = None
    description: Optional[str] = None
    stars: int = 0
    updated: Optional[datetime] = Field(default=None, validation_alias="pushed_at")
    indexed: bool
    analysis_status: AnalysisStatus
    indexed_files: int = Field(default=0, validation_alias="indexed_file_count")
    chunk_count: int = 0
    current_commit: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    last_analyzed_at: Optional[datetime] = None
    onboarding_progress: OnboardingProgress = Field(default_factory=OnboardingProgress)


class IngestRepositoryPayload(BaseModel):
    repoUrl: str = Field(min_length=1, max_length=500)


class IngestRepositoryResponse(CamelModel):
    repo_id: str
    status: AnalysisStatus
    message: str
    repository: RepositoryResponse


class IngestionStatusResponse(CamelModel):
    status: AnalysisStatus
    stage: Optional[str] = None
    progress: int = 0
    message: Optional[str] = None
    chunk_count: int = 0


class FileTreeNode(CamelModel):
    name: str
    path: str
    type: Literal["folder", "file"]
    children: Optional[list[FileTreeNode]] = None
    indexed: Optional[bool] = None


class FileContentResponse(CamelModel):
    path: str
    lang: str
    content: str
    start_line: int
    end_line: int


class GitHubRepositoryResponse(CamelModel):
    id: str
    name: str
    full_name: str
    url: str
    private: bool
    default_branch: str
    language: Optional[str] = None
    description: Optional[str] = None
    stars: int = 0
    updated: Optional[str] = None
    # DevRamp state for this GitHub repository
    indexed: bool = False
    selected: bool = False
    repo_id: Optional[str] = None


class RepositoryAccessPayload(BaseModel):
    repositoryIds: list[str] = Field(max_length=500)


class RepositoryAccessResponse(CamelModel):
    repository_ids: list[str]
