from dataclasses import dataclass
from typing import List


@dataclass
class HallucinationResult:
    risk: str  # low | medium | high | unknown
    score: float
    explanation: str


class HallucinationScorer:
    def __init__(self):
        self.model = None
        try:
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder("cross-encoder/nli-deberta-v3-small")
        except Exception:
            pass

    def score(self, answer: str, source_texts: List[str]) -> HallucinationResult:
        if not self.model:
            return HallucinationResult("unknown", 0.5, "Scorer unavailable")

        try:
            sentences = [s.strip() for s in answer.split(".") if len(s.strip()) > 15]
            if not sentences:
                return HallucinationResult("unknown", 0.5, "No sentences to score")

            entailment_scores = []
            for sentence in sentences[:5]:  # score first 5 sentences
                pairs = [(sentence, src) for src in source_texts[:3]]
                preds = self.model.predict(pairs)
                # NLI label 1 = entailment
                entailment = max(p[1] if len(p) > 1 else p[0] for p in preds)
                entailment_scores.append(float(entailment))

            avg = sum(entailment_scores) / len(entailment_scores)

            if avg > 0.7:
                risk, explanation = "low", "Answer is well-supported by sources"
            elif avg > 0.4:
                risk, explanation = "medium", "Some claims may lack strong source support"
            else:
                risk, explanation = "high", "Answer contains claims not clearly supported"

            return HallucinationResult(risk=risk, score=avg, explanation=explanation)
        except Exception as e:
            return HallucinationResult("unknown", 0.5, f"Scoring failed: {str(e)}")
