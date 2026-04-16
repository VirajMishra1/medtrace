from __future__ import annotations
"""Patient browsing endpoints."""
from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import PatientRecord
from backend.services import retriever

router = APIRouter()


@router.get("/patients/sample")
async def sample_patients(n: int = Query(default=10, ge=1, le=50)):
    samples = retriever.get_sample_patients(n)
    return [
        PatientRecord(
            patient_uid=p["patient_uid"],
            age=p.get("age"),
            gender=p.get("gender"),
            snippet=p.get("snippet", "")[:300],
        )
        for p in samples
    ]


@router.get("/patients/{patient_uid}")
async def get_patient(patient_uid: str):
    meta = retriever.get_patient_by_uid(patient_uid)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_uid} not found in index")
    return PatientRecord(
        patient_uid=meta["patient_uid"],
        age=meta.get("age"),
        gender=meta.get("gender"),
        snippet=meta.get("snippet", ""),
        full_note=meta.get("full_note"),
    )
