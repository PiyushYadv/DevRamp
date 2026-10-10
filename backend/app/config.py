from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]

class Settings(BaseSettings):
    PROJECT_NAME: str = "DevRamp Backend"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'devramp.db'}"

    # Cloned repositories persist here so tree, file viewer and analysis can read them anytime
    REPOS_DIR: str = str(BACKEND_DIR / "data" / "repos")
    
    GEMINI_API_KEY: str
    # text-embedding-004 is retired; gemini-embedding-001 supports 768-dim output via outputDimensionality
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768
    # gemini-1.5/2.5-flash are unavailable to new API keys; 3.5-flash streams the first token in ~1.5s at "minimal"
    GEMINI_CHAT_MODEL: str = "gemini-3.5-flash"
    GEMINI_THINKING_LEVEL: str = "minimal"  # minimal | low | medium | high
    # Used for retries after a 5xx from the primary model (free-tier overloads are common)
    GEMINI_FALLBACK_CHAT_MODEL: str = "gemini-3.5-flash-lite"
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str = "devramp-codebase"

    # Ingestion guardrails
    MAX_REPO_SIZE_MB: int = 250
    # Gemini free tier embeds ~100 chunks/minute, so 1500 chunks is roughly a 15 minute background index
    MAX_INDEXED_CHUNKS: int = 1500

    JWT_SECRET_KEY: str = "your-super-secret-key"
    JWT_ALGORITHM: str = "HS256"
    # The frontend has no refresh flow, so access tokens are long-lived
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # GitHub OAuth App (optional: GitHub sign-in returns 503 until configured)
    GITHUB_CLIENT_ID: str = Field(default="", validation_alias=AliasChoices("GITHUB_CLIENT_ID", "GITHUB_CLIENT"))
    GITHUB_CLIENT_SECRET: str = Field(default="", validation_alias=AliasChoices("GITHUB_CLIENT_SECRET", "GITHUB_SECRET"))

    # Anchored to backend/ so the app and tests work from any working directory
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env")

settings = Settings() #pyright: ignore[reportCallIssue]