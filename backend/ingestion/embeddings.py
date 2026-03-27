from sentence_transformers import SentenceTransformer
from threading import Lock
from typing import List

_model = None
_lock = Lock()


def get_model(model_name: str = "BAAI/bge-small-en-v1.5") -> SentenceTransformer:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = SentenceTransformer(model_name)
    return _model


def embed_documents(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    model = get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=len(texts) > 100
    )
    return embeddings.tolist()


def embed_query(text: str) -> List[float]:
    model = get_model()
    embedding = model.encode([text], normalize_embeddings=True)
    return embedding[0].tolist()
