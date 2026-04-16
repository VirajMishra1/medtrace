from __future__ import annotations
"""
Embedding Service — wraps LM Studio nomic-embed-text calls.
"""
import numpy as np
import openai
import asyncio
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, EMBED_MODEL, EMBED_DIM, LLM_TIMEOUT


_client = openai.OpenAI(
    base_url=LMSTUDIO_BASE_URL,
    api_key=LMSTUDIO_API_KEY,
    timeout=LLM_TIMEOUT,
)


def embed_text(text: str) -> np.ndarray:
    """Embed a single text string. Returns normalized 768-dim float32 vector."""
    text = text.strip()[:4096]  # hard cap
    try:
        resp = _client.embeddings.create(model=EMBED_MODEL, input=[text])
        vec = np.array(resp.data[0].embedding, dtype=np.float32)
    except Exception as e:
        print(f"[embedding_service] embed_text failed, returning zero vector: {e}")
        vec = np.zeros(EMBED_DIM, dtype=np.float32)

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec


def embed_texts(texts: list[str], batch_size: int = 32) -> np.ndarray:
    """Embed multiple texts in batches. Returns (N, EMBED_DIM) float32 array."""
    all_vecs = []
    for i in range(0, len(texts), batch_size):
        batch = [t.strip()[:4096] for t in texts[i:i + batch_size]]
        try:
            resp = _client.embeddings.create(model=EMBED_MODEL, input=batch)
            vecs = [d.embedding for d in resp.data]
        except Exception as e:
            print(f"[embedding_service] embed_texts batch {i}–{i+batch_size} failed, using zero vectors: {e}")
            vecs = [[0.0] * EMBED_DIM] * len(batch)
        all_vecs.extend(vecs)
    arr = np.array(all_vecs, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    return arr / norms


async def embed_text_async(text: str) -> np.ndarray:
    """Async wrapper for embed_text — runs in thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, embed_text, text)


def check_connection() -> bool:
    """Test LM Studio connectivity."""
    try:
        vec = embed_text("test")
        return vec is not None and vec.shape == (EMBED_DIM,)
    except Exception:
        return False
