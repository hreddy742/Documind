import uuid
from dataclasses import dataclass
from typing import List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue, NamedVector
)


@dataclass
class SearchResult:
    text: str
    filename: str
    doc_id: str
    chunk_index: int
    page_num: int
    score: float


class QdrantStore:
    def __init__(self, url: str, api_key: str, collection: str, dim: int):
        kwargs = {"url": url}
        if api_key:
            kwargs["api_key"] = api_key
        self.client = QdrantClient(**kwargs)
        self.collection = collection
        self.dim = dim

    def ensure_collection(self):
        existing = [c.name for c in self.client.get_collections().collections]
        if self.collection not in existing:
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=self.dim,
                    distance=Distance.COSINE
                )
            )

    def upsert(self, chunks, embeddings, doc_id: str, filename: str):
        points = []
        for chunk, embedding in zip(chunks, embeddings):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk.text,
                    "context": chunk.context,
                    "filename": filename,
                    "doc_id": doc_id,
                    "chunk_index": chunk.chunk_index,
                    "page_num": chunk.page_num,
                    "strategy": chunk.strategy
                }
            ))
        self.client.upsert(collection_name=self.collection, points=points)

    def search(
        self, query_vector: List[float], top_k: int,
        doc_id: Optional[str] = None
    ) -> List[SearchResult]:
        filter_cond = None
        if doc_id:
            filter_cond = Filter(must=[
                FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
            ])
        response = self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            limit=top_k,
            query_filter=filter_cond,
            with_payload=True,
        )
        return [
            SearchResult(
                text=r.payload["text"],
                filename=r.payload["filename"],
                doc_id=r.payload["doc_id"],
                chunk_index=r.payload["chunk_index"],
                page_num=r.payload["page_num"],
                score=r.score
            )
            for r in response.points
        ]

    def get_all_texts(self, doc_id: str) -> List[str]:
        results, _ = self.client.scroll(
            collection_name=self.collection,
            scroll_filter=Filter(must=[
                FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
            ]),
            limit=10000,
            with_payload=True
        )
        return [r.payload["text"] for r in results]
