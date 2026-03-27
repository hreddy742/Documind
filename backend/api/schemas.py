from pydantic import BaseModel, Field
from typing import Optional, List


class IngestResponse(BaseModel):
    doc_id: str
    filename: str
    chunks_created: int
    strategy: str
    total_ms: int


class Citation(BaseModel):
    number: int
    text: str
    filename: str
    page_num: int


class HallucinationResult(BaseModel):
    risk: str
    score: float
    explanation: str


class QueryMetrics(BaseModel):
    retrieval_ms: int
    rerank_ms: int
    generation_ms: int
    total_ms: int


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    hallucination: HallucinationResult
    metrics: QueryMetrics


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    chunks: int
    strategy: str
    created_at: str
    size_bytes: int


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    doc_id: str
    stream: bool = False
