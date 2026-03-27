import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.ingestion.pipeline import ingest
from backend.api.schemas import IngestResponse, DocumentInfo
from backend.db.database import get_db
from backend.db.models import insert_document, delete_document

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", response_model=IngestResponse)
async def upload_document(
    file: UploadFile = File(...),
    strategy: str = Form(default="fixed")
):
    if strategy not in ("fixed", "semantic", "sentence_window"):
        raise HTTPException(400, "strategy must be fixed, semantic, or sentence_window")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large. Maximum 50MB.")

    allowed = ("pdf", "docx", "txt")
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(400, f"File type .{ext} not supported. Use: {allowed}")

    doc_id = str(uuid.uuid4())
    result = await ingest(content, file.filename, strategy, doc_id)

    # Persist metadata to PostgreSQL
    async with get_db() as db:
        await insert_document(
            db,
            doc_id=doc_id,
            filename=file.filename,
            chunks=result["chunks_created"],
            strategy=strategy,
            size_bytes=len(content)
        )

    return IngestResponse(**result)


@router.get("/", response_model=List[DocumentInfo])
async def list_documents():
    async with get_db() as db:
        rows = await db.fetch("SELECT * FROM documents ORDER BY created_at DESC")
        return [
            DocumentInfo(
                doc_id=r["doc_id"],
                filename=r["filename"],
                chunks=r["chunks"],
                strategy=r["strategy"],
                created_at=r["created_at"].isoformat(),
                size_bytes=r["size_bytes"]
            )
            for r in rows
        ]


@router.delete("/{doc_id}", status_code=204)
async def delete_document_endpoint(doc_id: str):
    from backend.retrieval.vector_store import QdrantStore
    from backend.core.config import get_settings
    from qdrant_client.models import Filter, FieldCondition, MatchValue

    settings = get_settings()
    store = QdrantStore(
        settings.QDRANT_URL, settings.QDRANT_API_KEY,
        settings.QDRANT_COLLECTION, settings.EMBED_DIM
    )
    # Delete from Qdrant by doc_id filter
    store.client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=Filter(must=[
            FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
        ])
    )

    # Delete BM25 cache
    from pathlib import Path
    cache_path = Path("bm25_cache") / f"{doc_id}.pkl"
    if cache_path.exists():
        cache_path.unlink()

    # Delete from PostgreSQL
    async with get_db() as db:
        await delete_document(db, doc_id)
