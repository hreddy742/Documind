from typing import List


class CrossEncoderReranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = None
        try:
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder(model_name)
        except Exception as e:
            print(f"Reranker load failed: {e}. Using pass-through.")

    def rerank(self, query: str, chunks: List, top_n: int = 3) -> List:
        if not self.model or not chunks:
            return chunks[:top_n]
        pairs = [(query, c.text) for c in chunks]
        scores = self.model.predict(pairs)
        ranked = sorted(
            zip(chunks, scores),
            key=lambda x: x[1],
            reverse=True
        )
        return [c for c, _ in ranked[:top_n]]
