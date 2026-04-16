"""
Pydantic schemas for all MedTrace API request/response types.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


# === Request Models ===

class AnalysisOptions(BaseModel):
    top_k_patients: int = Field(default=10, ge=1, le=50)
    top_k_icd10: int = Field(default=15, ge=1, le=50)
    check_interactions: bool = True


class AnalyzeRequest(BaseModel):
    patient_note: str = Field(..., min_length=10)
    options: AnalysisOptions = Field(default_factory=AnalysisOptions)


# === Core Response primitives ===

class SimilarPatient(BaseModel):
    patient_uid: str
    age: Optional[int]
    gender: Optional[str]
    snippet: str
    similarity_score: float
    bm25_score: Optional[float] = None
    rrf_score: float


class ICD10Match(BaseModel):
    code: str
    description: str
    confidence: float


class Medication(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None


class DrugInteraction(BaseModel):
    type: str
    severity: str
    drugs_involved: List[str]
    condition_involved: Optional[str] = None
    description: str
    clinical_recommendation: str


class EvidenceItem(BaseModel):
    patient_uids: List[str]
    icd10_codes: List[str]


class Diagnosis(BaseModel):
    name: str
    icd10_code: Optional[str] = None
    confidence_label: str
    confidence_pct: float
    clinical_reasoning: str
    key_concerns: List[str]
    medication_flags: List[str]
    evidence: EvidenceItem


# ── Prompt 2: Admission Risk Simulation ──────────────────────────────────────

class RiskFactor(BaseModel):
    factor: str
    contribution: float
    icd10_code: Optional[str] = None
    category: str


class SimulationScenario(BaseModel):
    scenario: str
    condition_change: str
    new_probability: float
    delta: float
    timeframe: str
    severity: str


class AdmissionRiskResponse(BaseModel):
    admission_probability: float
    risk_level: str
    risk_factors: List[RiskFactor]
    simulation_scenarios: List[SimulationScenario]
    clinical_summary: str
    methodology_note: str


# ── Prompt 4: Cost & Utilization Analysis ────────────────────────────────────

class CostDriver(BaseModel):
    driver: str
    category: str
    estimated_contribution_pct: float
    icd10_codes: List[str]
    rationale: str


class UtilizationPrediction(BaseModel):
    icu_probability: float
    ward_probability: float
    outpatient_probability: float
    estimated_los_days_min: int
    estimated_los_days_max: int
    primary_setting: str


class CostAnalysisResponse(BaseModel):
    cost_tier: str
    cost_index: float
    cost_drivers: List[CostDriver]
    utilization: UtilizationPrediction
    reduction_opportunities: List[str]
    cost_summary: str


# ── Unified analysis response ─────────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    query_snippet: str
    similar_patients: List[SimilarPatient]
    icd10_matches: List[ICD10Match]
    medications: List[Medication]
    interactions: List[DrugInteraction]
    diagnoses: List[Diagnosis]
    admission_risk: Optional[AdmissionRiskResponse] = None
    cost_analysis: Optional[CostAnalysisResponse] = None
    processing_steps: List[str]


# === Utility response models ===

class PatientRecord(BaseModel):
    patient_uid: str
    age: Optional[int]
    gender: Optional[str]
    snippet: str
    full_note: Optional[str] = None


class HealthStatus(BaseModel):
    status: str
    lmstudio_connected: bool
    patient_index_loaded: bool
    icd10_index_loaded: bool
    bm25_index_loaded: bool
    patient_count: int
    icd10_count: int
    details: dict


class StatsResponse(BaseModel):
    total_patients_indexed: int
    total_icd10_codes: int
    embed_model: str
    llm_model: str
    retrieval_method: str
