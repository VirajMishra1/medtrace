from __future__ import annotations
"""
Medication Extractor — NLP extraction of drug names, dosages, frequencies, routes.
Uses qwen2.5-3b via LM Studio with structured JSON output.
"""
import json
import re
import openai
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, LLM_MODEL, LLM_MAX_TOKENS, LLM_TIMEOUT
from backend.models.schemas import Medication

_client = openai.OpenAI(
    base_url=LMSTUDIO_BASE_URL,
    api_key=LMSTUDIO_API_KEY,
    timeout=LLM_TIMEOUT,
)

USER_TEMPLATE = """Extract every medication from this clinical note. Be EXHAUSTIVE — do not skip any drug.

Clinical Note:
{patient_note}

Rules:
- Include ALL drugs, even PRN/as-needed medications
- Ignore lab values in parentheses like (INR 2.1), (HbA1c 8.2%), (BP 120/80) — those are NOT medications
- Use the generic drug name (e.g. "warfarin" not "Coumadin", "acetaminophen" not "Tylenol")
- Extract dosage (e.g. "5mg", "1000mg", "2g"), frequency (e.g. "daily", "twice daily", "PRN", "every 8 hours"), route (e.g. "oral", "IV", "subcutaneous", "inhaled")
- Set null for any field not explicitly mentioned

Example — for note "Patient on warfarin 5mg daily (INR 2.1), aspirin 81mg, metformin 1000mg twice daily PO":
[
  {{"drug_name": "warfarin", "dosage": "5mg", "frequency": "daily", "route": "oral"}},
  {{"drug_name": "aspirin", "dosage": "81mg", "frequency": null, "route": null}},
  {{"drug_name": "metformin", "dosage": "1000mg", "frequency": "twice daily", "route": "oral"}}
]

Now extract all medications from the note above. Output ONLY the JSON array. Start your response with ["""


def _parse_medications(raw: str) -> list[dict]:
    """Try to parse medication JSON from LLM output with fallbacks."""
    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()

    # Direct parse
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass

    # Find the LAST complete JSON array (avoids greedy match on explanatory text)
    matches = list(re.finditer(r"\[", raw))
    for m in reversed(matches):
        try:
            data = json.loads(raw[m.start():])
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

    return []


def extract_medications(patient_note: str) -> list[Medication]:
    """Extract medications from patient note using qwen2.5-3b."""
    note = patient_note[:1500]
    prompt = USER_TEMPLATE.format(patient_note=note)

    try:
        response = _client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,   # fully deterministic for safety-critical task
            max_tokens=LLM_MAX_TOKENS,
        )
        raw = response.choices[0].message.content or ""
    except Exception as e:
        print(f"[med_extractor] LLM call failed: {e}")
        raw = "[]"

    raw_meds = _parse_medications(raw)

    seen_names: set[str] = set()
    meds: list[Medication] = []
    for item in raw_meds:
        if not isinstance(item, dict):
            continue
        drug = item.get("drug_name") or item.get("drug") or item.get("name") or ""
        drug = str(drug).strip().lower()
        if not drug or drug in seen_names:
            continue
        seen_names.add(drug)

        dosage   = str(item.get("dosage",    "") or "").strip() or None
        freq     = str(item.get("frequency", "") or "").strip() or None
        route    = str(item.get("route",     "") or "").strip() or None

        # Sanity check: if dosage looks like it contains frequency words, split
        if dosage and any(w in dosage.lower() for w in ["daily", "twice", "every", "prn", "times"]):
            # dosage field contaminated with frequency — clear it
            if not freq:
                freq = dosage
            dosage = None

        meds.append(Medication(
            drug_name=str(item.get("drug_name") or item.get("drug") or item.get("name") or "").strip(),
            dosage=dosage,
            frequency=freq,
            route=route,
        ))

    return meds
