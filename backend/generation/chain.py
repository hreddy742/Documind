import re
import time
from dataclasses import dataclass
from typing import List, AsyncIterator

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

from backend.generation.prompts import RAG_SYSTEM, build_rag_prompt
from backend.core.config import get_settings


@dataclass
class Citation:
    number: int
    text: str
    filename: str
    page_num: int


@dataclass
class GenerationResult:
    answer: str
    citations: List[Citation]
    generation_ms: int
    tokens_used: int


class RAGChain:
    def __init__(self):
        settings = get_settings()
        self.llm = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_URL,
            temperature=0.1,
            num_predict=1024
        )

    def generate(self, query: str, chunks: List) -> GenerationResult:
        start = time.time()
        prompt = build_rag_prompt(query, chunks)
        messages = [
            SystemMessage(content=RAG_SYSTEM),
            HumanMessage(content=prompt)
        ]
        response = self.llm.invoke(messages)
        answer = response.content
        ms = int((time.time() - start) * 1000)

        # Parse citations
        used = set(int(n) for n in re.findall(r'\[(\d+)\]', answer))
        citations = []
        for i, chunk in enumerate(chunks, 1):
            if i in used:
                citations.append(Citation(
                    number=i,
                    text=chunk.text[:300],
                    filename=chunk.filename,
                    page_num=chunk.page_num
                ))

        return GenerationResult(
            answer=answer,
            citations=citations,
            generation_ms=ms,
            tokens_used=len(answer.split())
        )

    async def stream_generate(self, query: str, chunks: List) -> AsyncIterator[str]:
        prompt = build_rag_prompt(query, chunks)
        messages = [
            SystemMessage(content=RAG_SYSTEM),
            HumanMessage(content=prompt)
        ]
        async for chunk in self.llm.astream(messages):
            yield chunk.content
