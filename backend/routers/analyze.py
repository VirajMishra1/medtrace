from __future__ import annotations
"""
Core analysis endpoint: POST /api/analyze
Full MedTrace pipeline — Prompts 1, 2, 3, 4.
"""
import asyncio
import logging
import re
from fastapi import APIRouter
from backend.models.schemas import AnalyzeRequest, AnalysisResponse
from backend.services import retriever, icd10_mapper, embedding_service
from backend.services.medication_extractor import extract_medications
from backend.services.interaction_checker import check_interactions
from backend.services.diagnosis_generator import generate_diagnoses
from backend.services.admission_predictor import predict_admission_risk
from backend.services.cost_analyzer import analyze_costs
from backend.config import NOTE_EMBED_TRUNCATE

logger = logging.getLogger(__name__)
router = APIRouter()

_LLM_TASK_TIMEOUT = 45.0  # per-task timeout in seconds


def _extract_age_gender(note: str) -> tuple[int | None, str | None]:
    """Quick regex extraction of age and gender from patient note."""
    age = None
    gender = None

    age_match = re.search(
        r'\b(\d{1,3})[- ]?(?:year[s]?[- ]?old|yo\b|y\.?o\.?)',
        note, re.IGNORECASE
    )
    if age_match:
        candidate = int(age_match.group(1))
        if 0 < candidate < 120:
            age = candidate

    note_lower = note.lower()
    if any(w in note_lower for w in [' male', ' man ', ' him ', ' his ', ' boy', ' mr.']):
        gender = 'M'
    elif any(w in note_lower for w in [' female', ' woman ', ' her ', ' she ', ' girl', ' mrs.', ' ms.']):
        gender = 'F'

    return age, gender


async def _run_timed(coro, timeout: float, fallback, task_name: str):
    """Run a coroutine with a timeout; return fallback and log on timeout/error."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("[analyze] %s timed out after %.0fs", task_name, timeout)
        return fallback
    except Exception as exc:
        logger.error("[analyze] %s failed: %s", task_name, exc)
        return fallback


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_patient(request: AnalyzeRequest):
    steps: list[str] = []
    note = request.patient_note
    opts = request.options

    age, gender = _extract_age_gender(note)

    # Step 1: Embed query note
    steps.append("Embedding patient note with nomic-embed-text...")
    loop = asyncio.get_event_loop()
    query_vec = await loop.run_in_executor(
        None, embedding_service.embed_text, note[:NOTE_EMBED_TRUNCATE]
    )
    steps.append(f"Embedding complete (dim={query_vec.shape[0]})")

    # Step 2: Parallel — patient retrieval + ICD-10 mapping + medication extraction
    steps.append("Parallel retrieval: BM25 + FAISS dense + medication NLP...")

    similar_patients, icd10_matches, medications = await asyncio.gather(
        _run_timed(
            loop.run_in_executor(None, retriever.retrieve_similar_patients, note, query_vec, opts.top_k_patients),
            timeout=30.0, fallback=[], task_name="patient-retrieval",
        ),
        _run_timed(
            loop.run_in_executor(None, icd10_mapper.map_to_icd10, query_vec, opts.top_k_icd10),
            timeout=30.0, fallback=[], task_name="icd10-mapping",
        ),
        _run_timed(
            loop.run_in_executor(None, extract_medications, note),
            timeout=_LLM_TASK_TIMEOUT, fallback=[], task_name="medication-extraction",
        ),
    )

    steps.append(f"Retrieved {len(similar_patients)} similar patients (hybrid BM25+FAISS RRF)")
    steps.append(f"Mapped {len(icd10_matches)} ICD-10 codes (cosine similarity)")
    steps.append(f"Extracted {len(medications)} medications via NLP")
    steps.append("RRF score fusion complete")

    # Step 3: Parallel — interactions + diagnoses + admission risk + cost analysis
    steps.append("Running: interaction check · diagnoses · admission risk · cost analysis...")

    async def _empty_list():
        return []

    interactions_coro = (
        _run_timed(
            loop.run_in_executor(None, check_interactions, medications, icd10_matches),
            timeout=_LLM_TASK_TIMEOUT, fallback=[], task_name="interaction-check",
        )
        if opts.check_interactions and medications
        else _empty_list()
    )

    interactions, diagnoses, admission_risk, cost_analysis = await asyncio.gather(
        interactions_coro,
        _run_timed(
            loop.run_in_executor(None, generate_diagnoses, note, similar_patients, icd10_matches, medications),
            timeout=_LLM_TASK_TIMEOUT, fallback=[], task_name="diagnosis-generation",
        ),
        _run_timed(
            loop.run_in_executor(None, predict_admission_risk, icd10_matches, medications, age, gender),
            timeout=_LLM_TASK_TIMEOUT, fallback=None, task_name="admission-prediction",
        ),
        _run_timed(
            loop.run_in_executor(None, analyze_costs, icd10_matches, medications, age, gender),
            timeout=_LLM_TASK_TIMEOUT, fallback=None, task_name="cost-analysis",
        ),
    )

    crit = sum(1 for i in interactions if i.severity == "critical")
    warn = sum(1 for i in interactions if i.severity == "warning")
    steps.append(f"Interactions: {crit} critical, {warn} warnings")
    steps.append(f"Generated {len(diagnoses)} differential diagnoses")

    if admission_risk is not None:
        steps.append(f"Admission risk: {round(admission_risk.admission_probability * 100)}% ({admission_risk.risk_level})")
    else:
        steps.append("Admission risk: unavailable (timeout)")

    if cost_analysis is not None:
        steps.append(f"Cost tier: {cost_analysis.cost_tier} (index {cost_analysis.cost_index}/100)")
    else:
        steps.append("Cost analysis: unavailable (timeout)")

    steps.append("Analysis complete")

    return AnalysisResponse(
        query_snippet=note[:300],
        similar_patients=similar_patients,
        icd10_matches=icd10_matches,
        medications=medications,
        interactions=interactions,
        diagnoses=diagnoses,
        admission_risk=admission_risk,
        cost_analysis=cost_analysis,
        processing_steps=steps,
    )
