from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Ollama — open source LLM server
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"

    # Qdrant — open source vector database
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""          # empty for self-hosted
    QDRANT_COLLECTION: str = "documind"

    # Embedding model — local, no API
    EMBED_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBED_DIM: int = 384

    # Chunking defaults
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_RETRIEVE: int = 10
    TOP_K_RERANK: int = 3
    RRF_K: int = 60

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/documind"

    # App
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
