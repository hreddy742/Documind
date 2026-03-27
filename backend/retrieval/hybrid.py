import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from rank_bm25 import BM25Okapi

from backend.ingestion.embeddings import embed_query
from backend.retrieval.vector_store import QdrantStore, SearchResult
from backend.core.config import get_settings

BM25_CACHE_DIR = Path("bm25_cache")


@dataclass
class RetrievedChunk:
    text: str
    filename: str
    page_num: int
    chunk_index: int
    dense_rank: int
    sparse_rank: int
    rrf_score: float
    doc_id: str


class HybridRetriever:
    def __init__(self, doc_id: str):
        settings = get_settings()
        self.store = QdrantStore(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            collection=settings.QDRANT_COLLECTION,
            dim=settings.EMBED_DIM
        )
        self.doc_id = doc_id
        self.bm25: Optional[BM25Okapi] = None
        self.corpus_texts: List[str] = []
        self._load_bm25()

    def _load_bm25(self):
        cache_path = BM25_CACHE_DIR / f"{self.doc_id}.pkl"
        if cache_path.exists():
            with open(cache_path, "rb") as f:
                data = pickle.load(f)
                self.bm25 = data["bm25"]
                self.corpus_texts = data["texts"]
        else:
            # Rebuild from Qdrant on startup
            texts = self.store.get_all_texts(self.doc_id)
            if texts:
                self.corpus_texts = texts
                tokenized = [t.lower().split() for t in texts]
                self.bm25 = BM25Okapi(tokenized)

    def retrieve(
        self, query: str, top_k: int = 10, rrf_k: int = 60
    ) -> List[RetrievedChunk]:
        # Dense retrieval
        q_vec = embed_query(query)
        dense_results = self.store.search(q_vec, top_k, self.doc_id)

        # Sparse retrieval
        sparse_results = []
        if self.bm25 and self.corpus_texts:
            tokenized_query = query.lower().split()
            scores = self.bm25.get_scores(tokenized_query)
            top_indices = sorted(
                range(len(scores)), key=lambda i: scores[i], reverse=True
            )[:top_k]
            sparse_results = [(i, scores[i]) for i in top_indices]

        # RRF fusion
        rrf_scores = {}

        for rank, result in enumerate(dense_results):
            key = (result.chunk_index, result.doc_id)
            rrf_scores.setdefault(key, {
                "chunk": result,
                "dense_rank": rank + 1,
                "sparse_rank": top_k + 1
            })
            rrf_scores[key]["dense_rank"] = rank + 1

        for rank, (idx, _) in enumerate(sparse_results):
            if idx < len(self.corpus_texts):
                matched = next(
                    (v for k, v in rrf_scores.items() if k[0] == idx), None
                )
                if matched:
                    matched["sparse_rank"] = rank + 1
                else:
                    rrf_scores[(idx, self.doc_id)] = {
                        "chunk": None,
                        "dense_rank": top_k + 1,
                        "sparse_rank": rank + 1,
                        "text": self.corpus_texts[idx]
                    }

        # Compute RRF score
        final = []
        for key, val in rrf_scores.items():
            rrf = (1 / (rrf_k + val["dense_rank"])) + (1 / (rrf_k + val["sparse_rank"]))
            chunk = val.get("chunk")
            if chunk:
                final.append(RetrievedChunk(
                    text=chunk.text,
                    filename=chunk.filename,
                    page_num=chunk.page_num,
                    chunk_index=chunk.chunk_index,
                    dense_rank=val["dense_rank"],
                    sparse_rank=val["sparse_rank"],
                    rrf_score=rrf,
                    doc_id=chunk.doc_id
                ))

        return sorted(final, key=lambda x: x.rrf_score, reverse=True)[:top_k]
