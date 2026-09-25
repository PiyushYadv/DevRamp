from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DevRamp Backend"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "sqlite:///./devramp.db"
    
    GEMINI_API_KEY: str
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str = "devramp-codebase"

    JWT_SECRET_KEY: str = "your-super-secret-key"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings() #pyright: ignore[reportCallIssue]