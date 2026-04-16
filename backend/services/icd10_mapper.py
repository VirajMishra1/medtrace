from __future__ import annotations
"""
ICD-10 Mapper — maps patient note embeddings to ICD-10 codes via FAISS.
"""
import numpy as np
import faiss
import json
from backend.config import ICD10_FAISS_PATH, ICD10_MAPPING_PATH
from backend.models.schemas import ICD10Match

_icd10_index: faiss.Index | None = None
_icd10_mapping: dict | None = None


def load_icd10_index():
    global _icd10_index, _icd10_mapping

    if ICD10_FAISS_PATH.exists():
        _icd10_index = faiss.read_index(str(ICD10_FAISS_PATH))
        print(f"[icd10] Loaded ICD-10 FAISS index: {_icd10_index.ntotal} codes")
    else:
        print(f"[icd10] WARNING: ICD-10 FAISS index not found at {ICD10_FAISS_PATH}")

    if ICD10_MAPPING_PATH.exists():
        with open(ICD10_MAPPING_PATH) as f:
            _icd10_mapping = json.load(f)
        print(f"[icd10] Loaded ICD-10 mapping: {len(_icd10_mapping)} entries")
    else:
        print(f"[icd10] WARNING: ICD-10 mapping not found at {ICD10_MAPPING_PATH}")


def is_loaded() -> bool:
    return _icd10_index is not None and _icd10_mapping is not None


def map_to_icd10(query_vec: np.ndarray, top_k: int = 15) -> list[ICD10Match]:
    """
    Search ICD-10 FAISS index with query vector.
    Returns top_k ICD10Match objects with cosine similarity scores.
    """
    if _icd10_index is None or _icd10_mapping is None:
        return []

    q = query_vec.reshape(1, -1).astype(np.float32)
    scores, indices = _icd10_index.search(q, top_k)

    matches = []
    for idx, score in zip(indices[0], scores[0]):
        if idx < 0:
            continue
        entry = _icd10_mapping.get(str(idx)) or _icd10_mapping.get(idx)
        if entry is None:
            continue
        # Clamp cosine sim to [0, 1]
        confidence = float(max(0.0, min(1.0, score)))
        matches.append(ICD10Match(
            code=entry["code"],
            description=entry["description"],
            confidence=round(confidence, 4),
        ))
    return matches
