from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    chroma_persist_dir: str = Field(alias="CHROMA_PERSIST_DIR")
    chunk_size: int = Field(default=1000, alias="CHUNK_SIZE")


@lru_cache
def get_settings() -> Settings:
    return Settings()
