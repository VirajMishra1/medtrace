from __future__ import annotations
"""Health check and stats endpoints."""
import openai
from fastapi import APIRouter
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, EMBED_MODEL, LLM_MODEL
from backend.models.schemas import HealthStatus, StatsResponse
from backend.services import retriever, icd10_mapper

router = APIRouter()

_lm_client = openai.OpenAI(base_url=LMSTUDIO_BASE_URL, api_key=LMSTUDIO_API_KEY, timeout=5.0)


def _check_lmstudio() -> bool:
    try:
        models = _lm_client.models.list()
        return True
    except Exception:
        return False


@router.get("/health", response_model=HealthStatus)
async def health_check():
    lm_ok = _check_lmstudio()
    patient_ok = retriever.is_loaded()
    icd_ok = icd10_mapper.is_loaded()
    bm25_ok = retriever._bm25 is not None

    all_ok = lm_ok and patient_ok and icd_ok

    return HealthStatus(
        status="ok" if all_ok else ("degraded" if (patient_ok or icd_ok) else "error"),
        lmstudio_connected=lm_ok,
        patient_index_loaded=patient_ok,
        icd10_index_loaded=icd_ok,
        bm25_index_loaded=bm25_ok,
        patient_count=len(retriever._patient_metadata) if retriever._patient_metadata else 0,
        icd10_count=icd10_mapper._icd10_index.ntotal if icd10_mapper._icd10_index else 0,
        details={
            "lm_model": LLM_MODEL,
            "embed_model": EMBED_MODEL,
        }
    )


@router.get("/stats", response_model=StatsResponse)
async def stats():
    return StatsResponse(
        total_patients_indexed=len(retriever._patient_metadata) if retriever._patient_metadata else 0,
        total_icd10_codes=icd10_mapper._icd10_index.ntotal if icd10_mapper._icd10_index else 0,
        embed_model=EMBED_MODEL,
        llm_model=LLM_MODEL,
        retrieval_method="Hybrid BM25 + FAISS Dense (RRF fusion)",
    )
