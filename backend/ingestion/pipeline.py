import io
import pickle
import time
from pathlib import Path
from typing import Dict, Any

import pypdf
from rank_bm25 import BM25Okapi

from backend.ingestion.embeddings import embed_documents
from backend.ingestion.chunking import fixed_chunk, semantic_chunk, sentence_window_chunk
from backend.retrieval.vector_store import QdrantStore
from backend.core.config import get_settings

BM25_CACHE_DIR = Path("bm25_cache")
BM25_CACHE_DIR.mkdir(exist_ok=True)


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(
            page.extract_text() or "" for page in reader.pages
        )
    elif ext == "docx":
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def get_chunker(strategy: str):
    return {
        "fixed": fixed_chunk,
        "semantic": semantic_chunk,
        "sentence_window": sentence_window_chunk
    }.get(strategy, fixed_chunk)


async def ingest(
    file_bytes: bytes,
    filename: str,
    strategy: str,
    doc_id: str
) -> Dict[str, Any]:
    start = time.time()
    settings = get_settings()

    # Extract text
    text = extract_text(file_bytes, filename)

    # Chunk
    chunker = get_chunker(strategy)
    chunks = chunker(text)

    # Embed
    texts = [c.context if c.context else c.text for c in chunks]
    embeddings = embed_documents(texts)

    # Store in Qdrant
    store = QdrantStore(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        collection=settings.QDRANT_COLLECTION,
        dim=settings.EMBED_DIM
    )
    store.ensure_collection()
    store.upsert(chunks, embeddings, doc_id, filename)

    # Build and persist BM25 index
    tokenized = [t.lower().split() for t in texts]
    bm25 = BM25Okapi(tokenized)
    cache_path = BM25_CACHE_DIR / f"{doc_id}.pkl"
    with open(cache_path, "wb") as f:
        pickle.dump({"bm25": bm25, "texts": texts, "chunks": chunks}, f)

    total_ms = int((time.time() - start) * 1000)
    return {
        "doc_id": doc_id,
        "filename": filename,
        "chunks_created": len(chunks),
        "strategy": strategy,
        "total_ms": total_ms
    }
