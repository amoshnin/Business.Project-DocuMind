FROM python:3.11-slim

ARG INSTALL_DENSE=false

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    CHROMA_PERSIST_DIR=/var/data/chroma \
    DOCUMIND_DENSE_ENABLED=false

WORKDIR /app

COPY requirements.txt requirements.docker.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.docker.txt \
    && if [ "$INSTALL_DENSE" = "true" ]; then pip install langchain-huggingface langchain-chroma chromadb sentence-transformers; fi

COPY . .

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /var/data/chroma \
    && chown -R appuser:appuser /app /var/data

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read()"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
