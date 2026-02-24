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
    documind_dense_enabled: bool = Field(
        default=False, alias="DOCUMIND_DENSE_ENABLED"
    )
    documind_embeddings_model_name: str = Field(
        default="all-MiniLM-L6-v2", alias="DOCUMIND_EMBEDDINGS_MODEL_NAME"
    )
    documind_bm25_enabled: bool = Field(default=True, alias="DOCUMIND_BM25_ENABLED")
    documind_bm25_max_docs: int = Field(default=5000, alias="DOCUMIND_BM25_MAX_DOCS")
    documind_max_upload_mb: int = Field(default=20, alias="DOCUMIND_MAX_UPLOAD_MB")
    documind_cors_allow_origins: str | None = Field(
        default=None, alias="DOCUMIND_CORS_ALLOW_ORIGINS"
    )
    documind_cors_allow_origin_regex: str | None = Field(
        default=None, alias="DOCUMIND_CORS_ALLOW_ORIGIN_REGEX"
    )
    documind_warm_retriever_on_startup: bool = Field(
        default=False, alias="DOCUMIND_WARM_RETRIEVER_ON_STARTUP"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
