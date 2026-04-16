from __future__ import annotations
"""
Healthcare Cost & Utilization Analyzer (Prompt 4)
──────────────────────────────────────────────────
Integrates patient demographics + ICD-10 codes + medications to:
  1. Compute a relative cost index (rule-based from ICD-10 chapter × severity)
  2. Estimate resource utilization (ICU / ward / outpatient probabilities)
  3. Ask the LLM to identify the top cost drivers and reduction opportunities
"""
import json
import re
import openai
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, LLM_MODEL, LLM_TIMEOUT
from backend.models.schemas import (
    CostAnalysisResponse, CostDriver, UtilizationPrediction, ICD10Match, Medication
)

_client = openai.OpenAI(base_url=LMSTUDIO_BASE_URL, api_key=LMSTUDIO_API_KEY, timeout=LLM_TIMEOUT)

# ── ICD-10 chapter → relative cost tier ──────────────────────────────────────
# Based on CMS DRG average cost data by condition category
_CHAPTER_COST: dict[str, str] = {
    'A': 'high',     'B': 'medium',   # Infectious
    'C': 'critical', 'D': 'high',     # Neoplasms
    'E': 'medium',                    # Endocrine
    'F': 'low',                       # Mental health
    'G': 'high',                      # Neurological
    'H': 'low',                       # Eye / ear
    'I': 'critical',                  # Cardiovascular
    'J': 'high',                      # Respiratory
    'K': 'high',                      # Digestive
    'L': 'low',                       # Skin
    'M': 'medium',                    # Musculoskeletal
    'N': 'high',                      # Renal
    'O': 'high',                      # Pregnancy
    'P': 'high',                      # Perinatal
    'Q': 'high',                      # Congenital
    'R': 'medium',                    # Symptoms
    'S': 'high',    'T': 'high',      # Injury
    'U': 'high',                      # COVID / emergency
    'W': 'high',    'X': 'high',      # External causes (falls, poisoning)
    'Y': 'high',                      # External causes (medical complications)
    'Z': 'low',                       # Social
}

_TIER_SCORES = {'low': 20, 'medium': 45, 'high': 72, 'critical': 90}
_TIER_ORDER  = ['low', 'medium', 'high', 'critical']

# Code prefixes with known high cost
_HIGH_COST_CODES: dict[str, tuple[str, int]] = {
    'J80': ('ARDS — ICU + ventilator', 95),
    'A41': ('Sepsis — ICU + broad-spectrum antibiotics', 95),
    'I21': ('Acute MI — cath lab / PCI / CABG', 92),
    'I63': ('Stroke — stroke unit / thrombolysis', 88),
    'C34': ('Lung cancer — chemo / radiation', 90),
    'C18': ('Colon cancer — surgery / chemo', 88),
    'N17': ('Acute kidney injury — dialysis', 85),
    'J96': ('Respiratory failure — ICU', 93),
    'G93': ('Brain injury — ICU / neuro unit', 90),
    'K57': ('Diverticular disease — surgery risk', 70),
    'U07': ('COVID-19 — isolation + support care', 72),
}

# Medications that significantly increase cost
_HIGH_COST_MEDS = {
    'remdesivir': 75,
    'tocilizumab': 85,
    'nivolumab': 92,
    'pembrolizumab': 92,
    'trastuzumab': 88,
    'bevacizumab': 88,
    'rituximab': 85,
    'vancomycin': 60,
    'meropenem': 62,
    'caspofungin': 70,
    'insulin': 40,
    'warfarin': 35,
    'enoxaparin': 45,
    'amiodarone': 50,
    'tacrolimus': 72,
    'cyclosporine': 70,
    'epoetin': 65,
    'filgrastim': 70,
}


def _compute_cost_index(
    matches: list[ICD10Match],
    meds: list[Medication],
    age: int | None,
) -> tuple[float, str]:
    """Return (cost_index 0–100, cost_tier)."""
    scores: list[float] = []

    for m in matches[:8]:
        code = m.code.upper()
        # Check high-cost specific code
        base_score = None
        for prefix, (_, s) in _HIGH_COST_CODES.items():
            if code.startswith(prefix):
                base_score = s
                break
        if base_score is None:
            chapter = code[0] if code else 'Z'
            tier = _CHAPTER_COST.get(chapter, 'medium')
            base_score = _TIER_SCORES[tier]
        scores.append(base_score * m.confidence)

    # Medication contribution
    med_score = 0.0
    for med in meds:
        name_lower = med.drug_name.lower()
        for drug, s in _HIGH_COST_MEDS.items():
            if drug in name_lower:
                med_score = max(med_score, s * 0.4)
                break
    if len(meds) >= 5:
        med_score += min(15, (len(meds) - 4) * 3)

    # Age premium / discount
    age_score = 0.0
    if age is not None and age >= 75:
        age_score = 8.0
    elif age is not None and age >= 65:
        age_score = 4.0
    elif age is not None and age <= 25:
        age_score = -5.0

    base = max(scores) if scores else 30.0
    rest = sum(s * 0.12 for s in sorted(scores, reverse=True)[1:4])
    index = min(99.0, base + rest + med_score + age_score)

    if index >= 80:   tier = 'critical'
    elif index >= 60: tier = 'high'
    elif index >= 35: tier = 'medium'
    else:             tier = 'low'

    return round(index, 1), tier


def _utilization(cost_index: float, matches: list[ICD10Match]) -> UtilizationPrediction:
    """Rule-based utilization estimate."""
    icu_codes = {'J80', 'J96', 'A41', 'A40', 'I21', 'I60', 'I61', 'I63', 'G93', 'N17'}
    has_icu_code = any(
        any(m.code.upper().startswith(c) for c in icu_codes)
        for m in matches
    )

    if has_icu_code or cost_index >= 85:
        icu, ward, out = 0.70, 0.25, 0.05
        los_min, los_max = 7, 21
        setting = "ICU"
    elif cost_index >= 65:
        icu, ward, out = 0.30, 0.58, 0.12
        los_min, los_max = 4, 10
        setting = "General Ward"
    elif cost_index >= 40:
        icu, ward, out = 0.08, 0.55, 0.37
        los_min, los_max = 2, 6
        setting = "General Ward"
    else:
        icu, ward, out = 0.02, 0.20, 0.78
        los_min, los_max = 0, 2
        setting = "Outpatient"

    return UtilizationPrediction(
        icu_probability=icu, ward_probability=ward, outpatient_probability=out,
        estimated_los_days_min=los_min, estimated_los_days_max=los_max,
        primary_setting=setting,
    )


_COST_PROMPT = """You are a healthcare economics analyst. Identify the top cost drivers and cost reduction opportunities for this patient.

Patient:
- Age: {age}
- Gender: {gender}
- Cost tier: {cost_tier} (index: {cost_index}/100)
- ICD-10 conditions: {icd10_list}
- Medications: {med_list}
- Estimated setting: {setting} (LOS {los_min}–{los_max} days)

Output JSON with this exact structure:
{{
  "cost_drivers": [
    {{"driver": "ICU ventilator support", "category": "procedure", "estimated_contribution_pct": 38.0, "icd10_codes": ["J80"], "rationale": "ARDS requires prolonged mechanical ventilation"}},
    {{"driver": "Broad-spectrum antibiotics", "category": "medication", "estimated_contribution_pct": 22.0, "icd10_codes": ["A41"], "rationale": "Sepsis protocol requires IV antibiotics"}}
  ],
  "reduction_opportunities": [
    "Early mobilization protocol to reduce ICU LOS",
    "Antibiotic stewardship program to optimize antibiotic selection"
  ],
  "cost_summary": "One-paragraph summary of cost profile and key drivers"
}}
Make cost_drivers specific to this patient's actual conditions. Percentages should sum to ~100. Output only the JSON. Start your response with {{"""


def _llm_cost_analysis(
    cost_index: float, cost_tier: str,
    matches: list[ICD10Match], meds: list[Medication],
    util: UtilizationPrediction,
    age: int | None, gender: str | None,
) -> tuple[list[CostDriver], list[str], str]:
    icd10_list = "; ".join(f"{m.code}: {m.description[:50]}" for m in matches[:8]) or "None"
    med_list = ", ".join(
        f"{m.drug_name} {m.dosage or ''}".strip() for m in meds[:8]
    ) or "None"

    prompt = _COST_PROMPT.format(
        age=age or "unknown", gender=gender or "unknown",
        cost_tier=cost_tier, cost_index=cost_index,
        icd10_list=icd10_list, med_list=med_list,
        setting=util.primary_setting,
        los_min=util.estimated_los_days_min,
        los_max=util.estimated_los_days_max,
    )

    try:
        resp = _client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=900,
        )
        raw = resp.choices[0].message.content or "{}"
    except Exception as e:
        print(f"[cost_analyzer] LLM failed: {e}")
        raw = "{}"

    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`")
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        try:
            data = json.loads(m.group()) if m else {}
        except Exception:
            data = {}

    # Parse cost drivers
    drivers: list[CostDriver] = []
    valid_cats = {"medication", "procedure", "comorbidity", "demographic"}
    for item in (data.get("cost_drivers") or [])[:6]:
        if not isinstance(item, dict):
            continue
        cat = str(item.get("category", "comorbidity")).lower()
        if cat not in valid_cats:
            cat = "comorbidity"
        try:
            pct = float(item.get("estimated_contribution_pct", 10.0))
        except (ValueError, TypeError):
            pct = 10.0
        codes = item.get("icd10_codes") or []
        drivers.append(CostDriver(
            driver=str(item.get("driver", "Unknown")),
            category=cat,
            estimated_contribution_pct=round(min(100.0, pct), 1),
            icd10_codes=[str(c) for c in codes] if isinstance(codes, list) else [],
            rationale=str(item.get("rationale", "")),
        ))

    # Normalize percentages to sum to 100
    if drivers:
        total_pct = sum(d.estimated_contribution_pct for d in drivers)
        if total_pct > 0 and abs(total_pct - 100.0) > 5:
            scale = 100.0 / total_pct
            drivers = [CostDriver(
                driver=d.driver, category=d.category,
                estimated_contribution_pct=round(d.estimated_contribution_pct * scale, 1),
                icd10_codes=d.icd10_codes, rationale=d.rationale,
            ) for d in drivers]

    reductions = [str(r) for r in (data.get("reduction_opportunities") or [])[:5]]
    summary = str(data.get("cost_summary", "")).strip()

    return drivers, reductions, summary


def analyze_costs(
    icd10_matches: list[ICD10Match],
    medications: list[Medication],
    age: int | None = None,
    gender: str | None = None,
) -> CostAnalysisResponse:
    cost_index, cost_tier = _compute_cost_index(icd10_matches, medications, age)
    util = _utilization(cost_index, icd10_matches)
    drivers, reductions, summary = _llm_cost_analysis(
        cost_index, cost_tier, icd10_matches, medications, util, age, gender
    )

    # Fallback drivers if LLM fails
    if not drivers:
        # Infer category from ICD-10 code prefix
        _PROCEDURE_CHAPTERS = {'J', 'I', 'G', 'N', 'K', 'S', 'T'}  # high-procedure chapters
        _INFECTION_CHAPTERS  = {'A', 'B', 'J'}
        chapter_drivers = []
        for m in icd10_matches[:3]:
            code = m.code.upper()
            chapter = code[0] if code else 'Z'
            tier = _CHAPTER_COST.get(chapter, 'medium')
            if chapter in _PROCEDURE_CHAPTERS:
                cat = "procedure"
            elif chapter in _INFECTION_CHAPTERS:
                cat = "comorbidity"
            else:
                cat = "comorbidity"
            chapter_drivers.append(CostDriver(
                driver=f"{m.code}: {m.description[:50]}",
                category=cat,
                estimated_contribution_pct=round(30.0 * m.confidence, 1),
                icd10_codes=[m.code],
                rationale=f"ICD-10 {code} falls in {tier}-cost category",
            ))
        drivers = chapter_drivers

    if not reductions:
        reductions = [
            "Review medication regimen for generic alternatives",
            "Implement early discharge planning",
            "Coordinate post-acute care to reduce readmission risk",
        ]

    if not summary:
        summary = (
            f"Patient presents a {cost_tier}-tier cost profile (index {cost_index}/100). "
            f"Estimated setting: {util.primary_setting}, LOS {util.estimated_los_days_min}–{util.estimated_los_days_max} days."
        )

    return CostAnalysisResponse(
        cost_tier=cost_tier,
        cost_index=cost_index,
        cost_drivers=drivers,
        utilization=util,
        reduction_opportunities=reductions,
        cost_summary=summary,
    )
