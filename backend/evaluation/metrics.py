from dataclasses import dataclass
from typing import List, Optional


@dataclass
class EvalResult:
    rouge_l: Optional[float]
    answer_relevance: float
    faithfulness: Optional[float]


def evaluate(
    question: str,
    answer: str,
    retrieved_texts: List[str],
    reference: Optional[str] = None
) -> EvalResult:
    import numpy as np
    from backend.ingestion.embeddings import embed_query

    # ROUGE-L (only if reference provided)
    rouge_l = None
    if reference:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
        rouge_l = round(scorer.score(reference, answer).rougeL.fmeasure, 4)

    # Answer relevance: cosine similarity of question and answer embeddings
    q_vec = embed_query(question)
    a_vec = embed_query(answer)
    relevance = float(np.dot(q_vec, a_vec))  # normalized vectors, dot = cosine

    # Faithfulness: fraction of answer terms found in retrieved context
    context = " ".join(retrieved_texts).lower()
    answer_terms = set(answer.lower().split())
    stopwords = {"the", "a", "an", "is", "are", "was", "were", "in", "of", "to", "and", "or"}
    meaningful = answer_terms - stopwords
    if meaningful:
        faithfulness = sum(1 for t in meaningful if t in context) / len(meaningful)
    else:
        faithfulness = 1.0

    return EvalResult(
        rouge_l=rouge_l,
        answer_relevance=round(relevance, 4),
        faithfulness=round(faithfulness, 4)
    )
