from typing import List

RAG_SYSTEM = """You are DocuMind, a precise document analyst.

Your rules:
1. Answer ONLY from the provided document excerpts
2. Mark every factual claim with [1], [2], or [3] (the source number)
3. If the answer is not in the excerpts, say exactly:
   "I cannot find this information in the provided document."
4. Never use knowledge outside the provided excerpts
5. Be concise and precise"""


def build_rag_prompt(question: str, chunks: List) -> str:
    context = ""
    for i, chunk in enumerate(chunks, 1):
        context += f"\n[{i}] From '{chunk.filename}' (page {chunk.page_num}):\n{chunk.text}\n"
    return f"""Document excerpts:{context}

Question: {question}

Answer with citation numbers [1], [2], [3] for every claim:"""
