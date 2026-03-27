import json
import time

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.api.schemas import QueryRequest, QueryResponse
from backend.retrieval.hybrid import HybridRetriever
from backend.retrieval.reranker import CrossEncoderReranker
from backend.generation.chain import RAGChain
from backend.generation.hallucination import HallucinationScorer

router = APIRouter(prefix="/query", tags=["query"])

_reranker = CrossEncoderReranker()
_chain = RAGChain()
_scorer = HallucinationScorer()


@router.post("/", response_model=QueryResponse)
async def query_document(req: QueryRequest):
    total_start = time.time()

    t0 = time.time()
    retriever = HybridRetriever(req.doc_id)
    chunks = retriever.retrieve(req.question, top_k=10)
    retrieval_ms = int((time.time() - t0) * 1000)

    t1 = time.time()
    reranked = _reranker.rerank(req.question, chunks, top_n=3)
    rerank_ms = int((time.time() - t1) * 1000)

    t2 = time.time()
    result = _chain.generate(req.question, reranked)
    generation_ms = int((time.time() - t2) * 1000)

    hallucination = _scorer.score(
        result.answer,
        [c.text for c in reranked]
    )

    total_ms = int((time.time() - total_start) * 1000)

    return QueryResponse(
        answer=result.answer,
        citations=[
            {"number": c.number, "text": c.text,
             "filename": c.filename, "page_num": c.page_num}
            for c in result.citations
        ],
        hallucination={
            "risk": hallucination.risk,
            "score": hallucination.score,
            "explanation": hallucination.explanation
        },
        metrics={
            "retrieval_ms": retrieval_ms,
            "rerank_ms": rerank_ms,
            "generation_ms": result.generation_ms,
            "total_ms": total_ms
        }
    )


@router.post("/stream")
async def stream_query(req: QueryRequest):
    retriever = HybridRetriever(req.doc_id)
    chunks = retriever.retrieve(req.question, top_k=10)
    reranked = _reranker.rerank(req.question, chunks, top_n=3)

    async def event_generator():
        # First: send retrieved sources
        sources = [
            {"text": c.text[:200], "filename": c.filename, "page_num": c.page_num}
            for c in reranked
        ]
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

        # Then: stream tokens
        full_answer = ""
        async for token in _chain.stream_generate(req.question, reranked):
            full_answer += token
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

        # Finally: hallucination score
        hallucination = _scorer.score(full_answer, [c.text for c in reranked])
        yield f"event: complete\ndata: {json.dumps({'hallucination': {'risk': hallucination.risk, 'score': hallucination.score, 'explanation': hallucination.explanation}})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
