from __future__ import annotations
"""
Hybrid Retriever — BM25 (sparse) + FAISS (dense) with Reciprocal Rank Fusion.
Implements the PMC-Patients paper methodology.

RRF score = Σ 1/(k + rank_i)  where k=60
"""
import numpy as np
import faiss
import json
import pickle
from pathlib import Path
from backend.config import (
    PATIENT_FAISS_PATH, PATIENT_METADATA_PATH, BM25_INDEX_PATH, BM25_CORPUS_PATH,
    RRF_K, BM25_TOP_K, DENSE_TOP_K
)
from backend.models.schemas import SimilarPatient

# === Global state (loaded once at startup) ===
_patient_index: faiss.Index | None = None
_patient_metadata: list[dict] | None = None
_bm25 = None
_bm25_corpus: list[list[str]] | None = None


def load_indexes():
    """Load all patient indexes into memory. Called at app startup."""
    global _patient_index, _patient_metadata, _bm25, _bm25_corpus

    if PATIENT_FAISS_PATH.exists():
        _patient_index = faiss.read_index(str(PATIENT_FAISS_PATH))
        print(f"[retriever] Loaded patient FAISS index: {_patient_index.ntotal} vectors")
    else:
        print(f"[retriever] WARNING: patient FAISS index not found at {PATIENT_FAISS_PATH}")

    if PATIENT_METADATA_PATH.exists():
        with open(PATIENT_METADATA_PATH) as f:
            _patient_metadata = json.load(f)
        print(f"[retriever] Loaded patient metadata: {len(_patient_metadata)} entries")
    else:
        print(f"[retriever] WARNING: patient metadata not found at {PATIENT_METADATA_PATH}")

    if BM25_INDEX_PATH.exists():
        with open(BM25_INDEX_PATH, "rb") as f:
            _bm25 = pickle.load(f)
        print("[retriever] Loaded BM25 index")
    else:
        print(f"[retriever] WARNING: BM25 index not found at {BM25_INDEX_PATH}")

    if BM25_CORPUS_PATH.exists():
        with open(BM25_CORPUS_PATH, "rb") as f:
            _bm25_corpus = pickle.load(f)
        print(f"[retriever] Loaded BM25 corpus: {len(_bm25_corpus)} docs")
    else:
        print(f"[retriever] WARNING: BM25 corpus not found at {BM25_CORPUS_PATH}")


def is_loaded() -> bool:
    return _patient_index is not None and _patient_metadata is not None


def _dense_search(query_vec: np.ndarray, top_k: int) -> list[tuple[int, float]]:
    """FAISS inner product search. Returns (idx, score) pairs."""
    if _patient_index is None:
        return []
    q = query_vec.reshape(1, -1).astype(np.float32)
    scores, indices = _patient_index.search(q, top_k)
    return [(int(idx), float(score)) for idx, score in zip(indices[0], scores[0]) if idx >= 0]


def _bm25_search(query_note: str, top_k: int) -> list[tuple[int, float]]:
    """BM25 lexical search. Returns (idx, score) pairs."""
    if _bm25 is None:
        return []
    tokens = [t for t in query_note.lower().split() if t]
    if not tokens:
        return []
    scores = _bm25.get_scores(tokens)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [(int(idx), float(scores[idx])) for idx in top_indices]


def _rrf_fusion(
    dense_results: list[tuple[int, float]],
    bm25_results: list[tuple[int, float]],
    k: int = RRF_K,
) -> list[tuple[int, float, float, float]]:
    """
    Reciprocal Rank Fusion.
    Returns (idx, rrf_score, dense_score, bm25_score) sorted by rrf_score desc.
    """
    rrf_scores: dict[int, float] = {}
    dense_scores: dict[int, float] = {}
    bm25_scores: dict[int, float] = {}

    for rank, (idx, score) in enumerate(dense_results):
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (k + rank + 1)
        dense_scores[idx] = score

    for rank, (idx, score) in enumerate(bm25_results):
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (k + rank + 1)
        bm25_scores[idx] = score

    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(idx, rrf, dense_scores.get(idx, 0.0), bm25_scores.get(idx, 0.0)) for idx, rrf in fused]


def retrieve_similar_patients(
    query_note: str,
    query_vec: np.ndarray,
    top_k: int = 10,
) -> list[SimilarPatient]:
    """
    Hybrid BM25 + FAISS retrieval with RRF fusion.
    Returns top_k SimilarPatient objects.
    """
    if _patient_metadata is None:
        return []

    dense_results = _dense_search(query_vec, DENSE_TOP_K)
    bm25_results = _bm25_search(query_note, BM25_TOP_K)
    fused = _rrf_fusion(dense_results, bm25_results)[:top_k]

    patients = []
    for idx, rrf_score, dense_score, bm25_score in fused:
        if idx >= len(_patient_metadata):
            continue
        meta = _patient_metadata[idx]
        patients.append(SimilarPatient(
            patient_uid=meta["patient_uid"],
            age=meta.get("age"),
            gender=meta.get("gender"),
            snippet=meta.get("snippet", "")[:300],
            similarity_score=round(dense_score, 4),
            bm25_score=round(bm25_score, 4),
            rrf_score=round(rrf_score, 6),
        ))
    return patients


def get_patient_by_uid(uid: str) -> dict | None:
    """Lookup a patient record by uid."""
    if _patient_metadata is None:
        return None
    for meta in _patient_metadata:
        if meta["patient_uid"] == uid:
            return meta
    return None


def get_sample_patients(n: int = 10) -> list[dict]:
    """Return n random patient records for demo dropdown."""
    if _patient_metadata is None:
        return []
    import random
    sample = random.sample(_patient_metadata, min(n, len(_patient_metadata)))
    return sample
