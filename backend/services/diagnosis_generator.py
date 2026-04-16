from __future__ import annotations
"""
Diagnosis Generator — LLM-powered differential diagnosis with evidence chains.
Uses structured chain-of-thought prompting with qwen2.5-3b.
"""
import json
import re
import openai
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE, LLM_TIMEOUT
from backend.models.schemas import Diagnosis, EvidenceItem, SimilarPatient, ICD10Match, Medication

_client = openai.OpenAI(
    base_url=LMSTUDIO_BASE_URL,
    api_key=LMSTUDIO_API_KEY,
    timeout=LLM_TIMEOUT,
)

USER_TEMPLATE = """You are a clinical decision support system. Generate differential diagnoses for this patient.

Patient Note:
{patient_note}

Similar Historical Patients:
{similar_patients}

Matched ICD-10 Codes:
{icd10_codes}

Medications:
{medications}

Generate 3-5 differential diagnoses as a JSON array. Example format:
[
  {{
    "name": "COVID-19 Pneumonia",
    "icd10_code": "U07.1",
    "confidence_label": "high",
    "confidence_pct": 0.85,
    "clinical_reasoning": "Patient presents with fever, dry cough, and hypoxia consistent with COVID-19.",
    "key_concerns": ["hypoxia", "fever"],
    "medication_flags": ["dexamethasone appropriate for severe COVID"],
    "supporting_patient_uids": ["1234567-1"],
    "supporting_icd10_codes": ["U07.1"]
  }}
]
Only output the JSON array. Start your response with ["""


def _parse_diagnoses(raw: str) -> list[dict]:
    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    # Try to extract first JSON object and wrap in list
    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            return [data]
        except json.JSONDecodeError:
            pass
    return []


def generate_diagnoses(
    patient_note: str,
    similar_patients: list[SimilarPatient],
    icd10_matches: list[ICD10Match],
    medications: list[Medication],
) -> list[Diagnosis]:
    """Generate differential diagnoses with evidence chains."""

    # Format similar patients section
    if similar_patients:
        sp_text = "\n".join(
            f"- {p.patient_uid}: {p.snippet[:120]}"
            for p in similar_patients[:5]
        )
    else:
        sp_text = "No similar patients found."

    # Format ICD-10 section
    if icd10_matches:
        icd_text = "\n".join(
            f"- {m.code}: {m.description} (confidence={m.confidence:.2f})"
            for m in icd10_matches[:8]
        )
    else:
        icd_text = "No ICD-10 codes matched."

    # Format medications section
    if medications:
        med_text = "\n".join(
            f"- {m.drug_name} {m.dosage or ''} {m.frequency or ''}".strip()
            for m in medications
        )
    else:
        med_text = "No medications extracted."

    note_truncated = patient_note[:1200]
    prompt = USER_TEMPLATE.format(
        patient_note=note_truncated,
        similar_patients=sp_text,
        icd10_codes=icd_text,
        medications=med_text,
    )

    try:
        response = _client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
        raw = response.choices[0].message.content or ""
    except Exception as e:
        print(f"[diagnosis_generator] LLM call failed: {e}")
        raw = "[]"

    raw_diagnoses = _parse_diagnoses(raw)

    # Build set of valid UIDs and codes for evidence validation
    valid_uids = {p.patient_uid for p in similar_patients}
    valid_codes = {m.code for m in icd10_matches}

    diagnoses = []
    for item in raw_diagnoses:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "Unknown Diagnosis")).strip()
        if not name:
            continue

        conf_label = str(item.get("confidence_label", "low")).lower()
        if conf_label not in {"high", "medium", "low"}:
            conf_label = "low"

        try:
            conf_pct = float(item.get("confidence_pct", 0.5))
            conf_pct = max(0.0, min(1.0, conf_pct))
        except (ValueError, TypeError):
            conf_pct = 0.5

        # Evidence — only include refs that actually exist in our retrieval results
        raw_uids = item.get("supporting_patient_uids") or []
        raw_codes = item.get("supporting_icd10_codes") or []
        if not isinstance(raw_uids, list):
            raw_uids = []
        if not isinstance(raw_codes, list):
            raw_codes = []

        supporting_uids = [u for u in raw_uids if u in valid_uids]
        supporting_codes = [c for c in raw_codes if c in valid_codes]

        key_concerns = item.get("key_concerns") or []
        if not isinstance(key_concerns, list):
            key_concerns = [str(key_concerns)]

        med_flags = item.get("medication_flags") or []
        if not isinstance(med_flags, list):
            med_flags = [str(med_flags)]

        diagnoses.append(Diagnosis(
            name=name,
            icd10_code=item.get("icd10_code") or None,
            confidence_label=conf_label,
            confidence_pct=round(conf_pct, 2),
            clinical_reasoning=str(item.get("clinical_reasoning", "")).strip(),
            key_concerns=[str(c) for c in key_concerns],
            medication_flags=[str(f) for f in med_flags],
            evidence=EvidenceItem(
                patient_uids=supporting_uids,
                icd10_codes=supporting_codes,
            ),
        ))

    # Sort by confidence descending
    diagnoses.sort(key=lambda d: d.confidence_pct, reverse=True)

    # Fallback: if LLM returned nothing, infer from top ICD-10 match
    if not diagnoses and icd10_matches:
        top = icd10_matches[0]
        diagnoses = [Diagnosis(
            name=top.description,
            icd10_code=top.code,
            confidence_label="low",
            confidence_pct=round(top.confidence * 0.6, 2),
            clinical_reasoning="Inferred from top ICD-10 vector match (LLM output unavailable).",
            key_concerns=[],
            medication_flags=[],
            evidence=EvidenceItem(patient_uids=[], icd10_codes=[top.code]),
        )]

    return diagnoses
