from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-8b-instant", alias="GROQ_MODEL")
    chroma_persist_dir: str = Field(default="/var/data/chroma", alias="CHROMA_PERSIST_DIR")
    chunk_size: int = Field(default=1000, alias="CHUNK_SIZE")
    documind_bm25_enabled: bool = Field(default=True, alias="DOCUMIND_BM25_ENABLED")
    documind_bm25_max_docs: int = Field(default=5000, alias="DOCUMIND_BM25_MAX_DOCS")
    documind_warm_retriever_on_startup: bool = Field(
        default=False, alias="DOCUMIND_WARM_RETRIEVER_ON_STARTUP"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
