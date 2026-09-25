from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class RepositoryBase(BaseModel):
    owner: str
    name: str
    full_name: str = Field(alias="fullName")
    url: str
    default_branch: str = Field(alias="defaultBranch", default="main")
    is_private: bool = Field(alias="private", default=False)
    language: Optional[str] = None

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(RepositoryBase):
    id: str
    indexed: bool
    analysis_status: str = Field(alias="analysisStatus")
    current_commit: Optional[str] = Field(alias="currentCommit")
    last_synced_at: Optional[datetime] = Field(alias="lastSyncedAt")
    last_analyzed_at: Optional[datetime] = Field(alias="lastAnalyzedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)