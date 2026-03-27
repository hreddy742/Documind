import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.core.logging import setup_logging
from backend.api.routes import documents, query, health

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Pre-load embedding model
    from backend.ingestion.embeddings import get_model
    get_model(settings.EMBED_MODEL)

    # Ensure Qdrant collection exists
    from backend.retrieval.vector_store import QdrantStore
    store = QdrantStore(
        settings.QDRANT_URL, settings.QDRANT_API_KEY,
        settings.QDRANT_COLLECTION, settings.EMBED_DIM
    )
    store.ensure_collection()

    # Ensure PostgreSQL tables exist
    from backend.db.database import get_db
    from backend.db.models import create_tables
    async with get_db() as db:
        await create_tables(db)

    logging.info("DocuMind backend ready")
    yield


app = FastAPI(
    title="DocuMind API",
    description="Enterprise document intelligence with hybrid RAG",
    version="1.0.0",
    lifespan=lifespan
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)
app.include_router(health.router)
