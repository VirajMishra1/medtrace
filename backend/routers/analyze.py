from __future__ import annotations
"""
Core analysis endpoint: POST /api/analyze
Full MedTrace pipeline — Prompts 1, 2, 3, 4.
"""
import asyncio
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

router = APIRouter()


def _extract_age_gender(note: str) -> tuple[int | None, str | None]:
    """Quick regex extraction of age and gender from patient note."""
    age = None
    gender = None

    # Age: "60-year-old", "age 60", "aged 60", "a 60 year old"
    age_match = re.search(
        r'\b(\d{1,3})[- ]?(?:year[s]?[- ]?old|yo\b|y\.?o\.?)',
        note, re.IGNORECASE
    )
    if age_match:
        candidate = int(age_match.group(1))
        if 0 < candidate < 120:
            age = candidate

    # Gender
    note_lower = note.lower()
    if any(w in note_lower for w in [' male', ' man ', ' him ', ' his ', ' boy', ' mr.']):
        gender = 'M'
    elif any(w in note_lower for w in [' female', ' woman ', ' her ', ' she ', ' girl', ' mrs.', ' ms.']):
        gender = 'F'

    return age, gender


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_patient(request: AnalyzeRequest):
    steps = []
    note = request.patient_note
    opts = request.options

    # Extract demographics from note text (fast, no LLM)
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
        loop.run_in_executor(None, retriever.retrieve_similar_patients, note, query_vec, opts.top_k_patients),
        loop.run_in_executor(None, icd10_mapper.map_to_icd10, query_vec, opts.top_k_icd10),
        loop.run_in_executor(None, extract_medications, note),
    )

    steps.append(f"Retrieved {len(similar_patients)} similar patients (hybrid BM25+FAISS RRF)")
    steps.append(f"Mapped {len(icd10_matches)} ICD-10 codes (cosine similarity)")
    steps.append(f"Extracted {len(medications)} medications via NLP")
    steps.append("RRF score fusion complete")

    # Step 3: Parallel — interactions + diagnoses + admission risk + cost analysis
    steps.append("Running: interaction check · diagnoses · admission risk · cost analysis...")

    async def _empty():
        return []

    interactions_task = loop.run_in_executor(None, check_interactions, medications, icd10_matches) \
        if opts.check_interactions and medications else _empty()

    diagnoses_task = loop.run_in_executor(
        None, generate_diagnoses, note, similar_patients, icd10_matches, medications
    )
    admission_task = loop.run_in_executor(
        None, predict_admission_risk, icd10_matches, medications, age, gender
    )
    cost_task = loop.run_in_executor(
        None, analyze_costs, icd10_matches, medications, age, gender
    )

    interactions, diagnoses, admission_risk, cost_analysis = await asyncio.gather(
        interactions_task, diagnoses_task, admission_task, cost_task,
    )

    crit = sum(1 for i in interactions if i.severity == "critical")
    warn = sum(1 for i in interactions if i.severity == "warning")
    steps.append(f"Interactions: {crit} critical, {warn} warnings")
    steps.append(f"Generated {len(diagnoses)} differential diagnoses")
    steps.append(f"Admission risk: {round(admission_risk.admission_probability * 100)}% ({admission_risk.risk_level})")
    steps.append(f"Cost tier: {cost_analysis.cost_tier} (index {cost_analysis.cost_index}/100)")
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
