import re
import numpy as np
from dataclasses import dataclass, field
from typing import List


@dataclass
class Chunk:
    text: str
    chunk_index: int
    start_char: int
    end_char: int
    page_num: int
    strategy: str
    context: str = ""  # for sentence-window: surrounding sentences


def fixed_chunk(text: str, size: int = 512, overlap: int = 50) -> List[Chunk]:
    chunks = []
    start = 0
    index = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(Chunk(
                text=chunk_text,
                chunk_index=index,
                start_char=start,
                end_char=end,
                page_num=_estimate_page(start, len(text)),
                strategy="fixed"
            ))
            index += 1
        start = end - overlap if end < len(text) else len(text)
    return chunks


def semantic_chunk(text: str, threshold: float = 0.80) -> List[Chunk]:
    from backend.ingestion.embeddings import embed_documents

    sentences = _split_sentences(text)
    if len(sentences) <= 1:
        return fixed_chunk(text)

    embeddings = embed_documents(sentences)

    chunks = []
    current_sentences = [sentences[0]]
    current_start = 0
    index = 0

    for i in range(1, len(sentences)):
        sim = _cosine_sim(embeddings[i - 1], embeddings[i])
        if sim < threshold:
            chunk_text = " ".join(current_sentences)
            chunks.append(Chunk(
                text=chunk_text,
                chunk_index=index,
                start_char=current_start,
                end_char=current_start + len(chunk_text),
                page_num=_estimate_page(current_start, len(text)),
                strategy="semantic"
            ))
            current_start += len(chunk_text) + 1
            current_sentences = [sentences[i]]
            index += 1
        else:
            current_sentences.append(sentences[i])

    if current_sentences:
        chunk_text = " ".join(current_sentences)
        chunks.append(Chunk(
            text=chunk_text,
            chunk_index=index,
            start_char=current_start,
            end_char=len(text),
            page_num=_estimate_page(current_start, len(text)),
            strategy="semantic"
        ))
    return chunks


def sentence_window_chunk(text: str, window: int = 2) -> List[Chunk]:
    sentences = _split_sentences(text)
    chunks = []
    for i, sentence in enumerate(sentences):
        context_start = max(0, i - window)
        context_end = min(len(sentences), i + window + 1)
        context = " ".join(sentences[context_start:context_end])
        pos = text.find(sentence)
        chunks.append(Chunk(
            text=sentence,
            chunk_index=i,
            start_char=pos,
            end_char=pos + len(sentence),
            page_num=_estimate_page(pos, len(text)),
            strategy="sentence_window",
            context=context
        ))
    return chunks


def _split_sentences(text: str) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 10]


def _cosine_sim(a: List[float], b: List[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr) + 1e-8))


def _estimate_page(char_pos: int, total_chars: int) -> int:
    chars_per_page = 3000
    return max(1, char_pos // chars_per_page + 1)
