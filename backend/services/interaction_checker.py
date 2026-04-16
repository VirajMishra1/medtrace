from __future__ import annotations
"""
Drug Interaction Checker — cross-references medications × ICD-10 codes
to flag drug-drug, drug-condition, and dosage concerns.
"""
import json
import re
import openai
from backend.config import LMSTUDIO_BASE_URL, LMSTUDIO_API_KEY, LLM_MODEL, LLM_TIMEOUT
from backend.models.schemas import Medication, ICD10Match, DrugInteraction

_client = openai.OpenAI(
    base_url=LMSTUDIO_BASE_URL,
    api_key=LMSTUDIO_API_KEY,
    timeout=LLM_TIMEOUT,
)

USER_TEMPLATE = """You are a pharmacovigilance safety system. Your job is to detect EVERY clinically significant drug-drug interaction, drug-condition contraindication, and dosage concern. Patient safety depends on thoroughness — do NOT return an empty array unless the medication list contains only 1 drug with no conditions.

Medications:
{med_list}

Patient Conditions (ICD-10):
{icd_list}

KNOWN CRITICAL INTERACTIONS — always flag these if present:
• warfarin + aspirin/NSAIDs/clopidogrel → major bleeding risk (critical)
• warfarin + amiodarone/fluconazole/metronidazole → INR elevation, bleeding (critical)
• warfarin + antibiotics (ciprofloxacin, metronidazole, trimethoprim) → INR instability (critical)
• heparin/enoxaparin + aspirin/NSAIDs → additive bleeding (critical)
• ACE inhibitor + potassium-sparing diuretic/potassium supplement → hyperkalemia (critical)
• metformin + contrast dye or renal impairment (N17/N18 ICD codes) → lactic acidosis risk (critical)
• metformin + eGFR < 30 (N18.4/N18.5) → contraindicated (critical)
• SSRI/SNRI + tramadol/triptans/MAOIs → serotonin syndrome (critical)
• QT-prolonging drugs (amiodarone, haloperidol, ondansetron, azithromycin, ciprofloxacin) combined → torsades de pointes (critical)
• NSAIDs + anticoagulants → GI bleeding (critical)
• lithium + NSAIDs/diuretics → lithium toxicity (critical)
• digoxin + amiodarone/verapamil/quinidine → digoxin toxicity (critical)
• opioids + benzodiazepines → respiratory depression (critical)
• insulin/sulfonylurea + beta-blockers → masked hypoglycemia signs (warning)
• statins (simvastatin/lovastatin) + CYP3A4 inhibitors (amiodarone, diltiazem) → rhabdomyolysis (warning)
• ACE inhibitor/ARB in pregnancy (O codes) → fetotoxic (critical)
• NSAIDs in heart failure (I50) → fluid retention, worsening HF (warning)
• beta-blockers in asthma/COPD (J45/J44) → bronchospasm (warning)

For drug-condition interactions, cross-reference every ICD-10 code against all medications.
For drug-drug interactions, check every pair of medications.

Output a JSON array of ALL interactions found:
[
  {{"type": "drug-drug", "severity": "critical", "drugs_involved": ["warfarin", "aspirin"], "condition_involved": null, "description": "Concurrent warfarin and aspirin significantly increases major bleeding risk including GI and intracranial haemorrhage.", "clinical_recommendation": "Avoid combination unless benefit clearly outweighs risk; if unavoidable, use lowest aspirin dose (81mg), monitor INR closely, consider PPI prophylaxis."}},
  {{"type": "drug-condition", "severity": "warning", "drugs_involved": ["metformin"], "condition_involved": "N18.3 Chronic kidney disease stage 3", "description": "Metformin may accumulate in renal impairment, increasing lactic acidosis risk.", "clinical_recommendation": "Check eGFR; reduce dose if eGFR 30-45, contraindicate if eGFR < 30."}}
]

type: drug-drug | drug-condition | dosage-concern
severity: critical | warning | info

Only output the JSON array. Start your response with ["""


def _parse_interactions(raw: str) -> list[dict]:
    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    # Reversed search — find last valid JSON array to avoid greedy match on explanatory text
    for m in reversed(list(re.finditer(r"\[", raw))):
        try:
            data = json.loads(raw[m.start():])
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    return []


# ---------------------------------------------------------------------------
# Rule-based interaction engine — always fires, no LLM required.
# Each rule: (set of drug name fragments that must ALL be present, severity, type, description, recommendation)
# ---------------------------------------------------------------------------
_DRUG_DRUG_RULES: list[tuple[set[str], str, str, str]] = [
    (
        {"warfarin", "amiodarone"},
        "critical",
        "Warfarin + Amiodarone: major INR elevation and bleeding risk. Amiodarone inhibits CYP2C9, dramatically increasing warfarin levels.",
        "Hold amiodarone if possible; recheck INR within 48 hours; reduce warfarin dose by 30–50%; consider anticoagulation bridge.",
    ),
    (
        {"warfarin", "aspirin"},
        "critical",
        "Warfarin + Aspirin: additive bleeding risk including GI and intracranial haemorrhage.",
        "Avoid unless benefit clearly outweighs risk. If unavoidable, use lowest aspirin dose (81mg), monitor INR closely, add PPI prophylaxis.",
    ),
    (
        {"warfarin", "ibuprofen"},
        "critical",
        "Warfarin + NSAID: increased bleeding risk.",
        "Avoid NSAIDs; use paracetamol for analgesia if needed.",
    ),
    (
        {"amiodarone", "simvastatin"},
        "warning",
        "Amiodarone + Simvastatin: CYP3A4 inhibition increases statin exposure, raising rhabdomyolysis risk.",
        "Cap simvastatin at 20mg/day or switch to a less-affected statin (rosuvastatin, pravastatin).",
    ),
    (
        {"amiodarone", "atorvastatin"},
        "warning",
        "Amiodarone + Atorvastatin: CYP3A4 inhibition may increase atorvastatin levels, raising rhabdomyolysis risk.",
        "Monitor for muscle pain/weakness; consider dose reduction or switching to pravastatin.",
    ),
    (
        {"amiodarone", "digoxin"},
        "critical",
        "Amiodarone + Digoxin: amiodarone inhibits P-glycoprotein, causing digoxin toxicity.",
        "Reduce digoxin dose by 50%; monitor digoxin levels and ECG closely.",
    ),
    (
        {"opioid", "benzodiazepine"},
        "critical",
        "Opioid + Benzodiazepine: additive CNS and respiratory depression.",
        "Avoid combination; if unavoidable, use lowest effective doses and monitor closely.",
    ),
    (
        {"morphine", "diazepam"},
        "critical",
        "Opioid + Benzodiazepine: additive CNS and respiratory depression.",
        "Avoid combination; if unavoidable, use lowest effective doses and monitor closely.",
    ),
]

# Drug-condition rules: (drug fragment, ICD-10 code prefix/fragment, severity, description, recommendation)
_DRUG_CONDITION_RULES: list[tuple[str, str, str, str, str]] = [
    (
        "metformin", "N18",
        "critical",
        "Metformin + Chronic Kidney Disease (N18): risk of metformin accumulation and lactic acidosis.",
        "Check eGFR; reduce dose if eGFR 30–45 mL/min/1.73m², contraindicate if eGFR < 30.",
    ),
    (
        "metformin", "N17",
        "critical",
        "Metformin + Acute Kidney Injury: contraindicated due to lactic acidosis risk.",
        "Hold metformin immediately; restart only after renal function recovers.",
    ),
    (
        "lisinopril", "N18",
        "warning",
        "ACE inhibitor + Chronic Kidney Disease: risk of hyperkalemia and worsening renal function.",
        "Monitor potassium and creatinine closely; dose adjustment may be required.",
    ),
    (
        "warfarin", "D683",
        "warning",
        "Warfarin + Hemorrhagic disorder: elevated bleeding risk in a patient with existing coagulopathy.",
        "Review anticoagulation indication; consider dose adjustment and closer INR monitoring.",
    ),
]


def _rule_based_interactions(
    medications: list[Medication],
    icd10_matches: list[ICD10Match],
) -> list[DrugInteraction]:
    """Deterministic interaction check — never misses known pairs."""
    drug_names = {m.drug_name.lower() for m in medications}
    icd_codes = {m.code.upper() for m in icd10_matches}
    found: list[DrugInteraction] = []

    for (required_drugs, severity, description, recommendation) in _DRUG_DRUG_RULES:
        if all(
            any(fragment in name for name in drug_names)
            for fragment in required_drugs
        ):
            found.append(DrugInteraction(
                type="drug-drug",
                severity=severity,
                drugs_involved=sorted(required_drugs),
                condition_involved=None,
                description=description,
                clinical_recommendation=recommendation,
            ))

    for (drug_fragment, code_prefix, severity, description, recommendation) in _DRUG_CONDITION_RULES:
        drug_present = any(drug_fragment in name for name in drug_names)
        condition_present = any(code.startswith(code_prefix) for code in icd_codes)
        if drug_present and condition_present:
            matching_code = next(
                (m for m in icd10_matches if m.code.upper().startswith(code_prefix)), None
            )
            found.append(DrugInteraction(
                type="drug-condition",
                severity=severity,
                drugs_involved=[drug_fragment],
                condition_involved=matching_code.code + ": " + matching_code.description if matching_code else code_prefix,
                description=description,
                clinical_recommendation=recommendation,
            ))

    return found


def check_interactions(
    medications: list[Medication],
    icd10_matches: list[ICD10Match],
) -> list[DrugInteraction]:
    """Check for drug interactions and contraindications."""
    if not medications:
        return []

    # Always run the deterministic rule engine first
    interactions = _rule_based_interactions(medications, icd10_matches)
    already_flagged = {
        frozenset(i.drugs_involved) for i in interactions
    }

    # LLM pass for any additional interactions the rules don't cover
    med_list = "\n".join(
        f"- {m.drug_name} {m.dosage or ''} {m.frequency or ''} {m.route or ''}".strip()
        for m in medications
    )
    icd_list = "\n".join(
        f"- {m.code}: {m.description}"
        for m in icd10_matches[:8]
    )

    prompt = USER_TEMPLATE.format(med_list=med_list, icd_list=icd_list or "None provided")

    try:
        response = _client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=800,
        )
        raw = response.choices[0].message.content or ""
    except Exception as e:
        print(f"[interaction_checker] LLM call failed: {e}")
        raw = "[]"

    valid_types = {"drug-drug", "drug-condition", "dosage-concern"}
    valid_severities = {"critical", "warning", "info"}

    for item in _parse_interactions(raw):
        if not isinstance(item, dict):
            continue
        itype = str(item.get("type", "info")).lower()
        severity = str(item.get("severity", "info")).lower()
        if itype not in valid_types:
            itype = "info"
        if severity not in valid_severities:
            severity = "info"

        drugs = item.get("drugs_involved", [])
        if not isinstance(drugs, list):
            drugs = [str(drugs)]
        drugs = [str(d) for d in drugs]

        # Skip if already caught by the rule engine
        if frozenset(d.lower() for d in drugs) in already_flagged:
            continue

        interactions.append(DrugInteraction(
            type=itype,
            severity=severity,
            drugs_involved=drugs,
            condition_involved=item.get("condition_involved") or None,
            description=str(item.get("description", "")),
            clinical_recommendation=str(item.get("clinical_recommendation", "")),
        ))

    # Sort: critical first
    order = {"critical": 0, "warning": 1, "info": 2}
    interactions.sort(key=lambda x: order.get(x.severity, 3))
    return interactions
