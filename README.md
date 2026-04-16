# MedTrace — Clinical Decision Support Platform

> Built for the Palantir Build Challenge. Addresses all four challenge prompts.

MedTrace turns unstructured clinical notes into structured intelligence. Paste a patient note and the pipeline returns differential diagnoses, extracted medications, drug interaction alerts, admission risk simulation, and cost modelling — all running locally via LM Studio, no data leaving the machine.

**Demo:** https://www.youtube.com/watch?v=mpyxWMoXNaY

---

## What it does

| Module | Description |
|--------|-------------|
| **Hybrid Retrieval** | BM25 + FAISS over 15,000 indexed patient records, fused with Reciprocal Rank Fusion |
| **ICD-10 Mapping** | Semantic nearest-neighbour search over 10,000 embedded ICD-10 descriptions |
| **Medication Extraction** | NLP extraction of drug name, dosage, frequency, route at temperature=0 |
| **Drug Interaction Detection** | Rule-based engine (17 hardcoded pairs) + LLM pass for drug-condition interactions |
| **Admission Risk Simulation** | Rule-based ICD-10 chapter weights as baseline + LLM forward scenario generation |
| **Cost & Utilisation Modelling** | CMS DRG tier mapping + LLM-identified cost drivers and reduction opportunities |

---

## Architecture

```
Patient Note
    │
    ▼
[nomic-embed-text-v1.5] ── 768-dim vector
    │
    ├──► [BM25 (rank_bm25)]       ┐
    │                             ├── RRF Fusion (k=60) ──► Similar Patients
    ├──► [FAISS IndexFlatIP]      ┘
    │
    ├──► [ICD-10 FAISS Index] ──────────────────────────► ICD-10 Codes (top-15)
    │
    └──► [qwen2.5-3b @ temp=0] ─────────────────────────► Medications
              │
              ├──► [Rule-based interaction engine]  ─────► Drug Interactions
              │         + [qwen2.5-3b drug-condition pass]
              │
              ├──► [qwen2.5-3b diagnosis generation] ────► Differential Diagnoses
              │
              ├──► [ICD-10 chapter weights (rule-based)] ► Admission Risk baseline
              │     + [qwen2.5-3b scenario simulation]      + Forward Scenarios
              │
              └──► [CMS DRG tier mapping (rule-based)] ──► Cost Index
                    + [qwen2.5-3b driver identification]     + Reduction Opportunities
```

**Data source:** Zhao et al., "PMC-Patients: A Large-scale Dataset of Patient Summaries and Relations for Benchmarking Retrieval-based Clinical Decision Support Systems" (2023). 15,000 patient records indexed from the full 167K corpus.

---

## Key design decisions

**Temperature=0 on safety-critical tasks.** Medication extraction and drug interaction classification both run fully deterministically. The model is given a fixed list of 17 dangerous drug combinations and asked to classify — not reason freely.

**Rule-based anchors for every safety-critical number.** Admission risk baseline comes from ICD-10 chapter severity weights taken from published literature (sepsis=0.97, acute MI=0.97, ARDS=0.97). The LLM only generates forward scenarios — it cannot corrupt the baseline score.

**Evidence validation.** Every patient UID and ICD-10 code cited in a diagnosis is cross-checked against actual retrieval results before being shown. The model cannot hallucinate a citation that was not retrieved.

**Interaction checker defence-in-depth.** A deterministic Python rule engine runs first and always fires for known pairs (warfarin+amiodarone, warfarin+aspirin, metformin+CKD, statin+amiodarone etc.). The LLM runs as a second pass only for drug-condition interactions not covered by the rules. Known interactions are never silently dropped due to LLM output failure.

**Local-only inference.** All models run through LM Studio on localhost:1234. No patient data is sent to any external service. HIPAA-compliant by architecture.

---

## Setup

### Prerequisites

1. **LM Studio** with these models loaded and local server enabled at `http://localhost:1234/v1`:
   - `qwen2.5-3b-instruct`
   - `nomic-embed-text-v1.5`

2. **Python 3.11+** and **Node 18+**

3. **Source data files** (place in `data/` — not included in repo):
   - `PMC_Patients_clean.csv` — from [PMC-Patients dataset](https://huggingface.co/datasets/zhengyun21/PMC-Patients)
   - `icd_10_codes.csv` — ICD-10 code list
   - `icd_10_embeddings.npy` — pre-computed embeddings (optional, re-embedded at index build time)

### Install

```bash
pip install -r requirements.txt
cd frontend && npm install --legacy-peer-deps && cd ..
```

### Build indexes

Start LM Studio first with both models loaded, then:

```bash
# Build ICD-10 FAISS index (~10-15 min, embeds 10K codes)
python3 scripts/build_icd10_index.py

# Build patient FAISS + BM25 indexes (~15-25 min, embeds 15K patients)
python3 scripts/build_patient_index.py
```

Indexes are saved to `indexes/` (gitignored — must be built locally).

### Run

```bash
./start.sh
```

Or manually:

```bash
# Terminal 1
PYTHONPATH=. python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2
cd frontend && npm start
```

Visit: http://localhost:3000

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Full 13-stage analysis pipeline |
| `/api/patients/sample?n=10` | GET | Random patient records from index |
| `/api/patients/{uid}` | GET | Single patient by UID |
| `/api/health` | GET | System status + index load check |
| `/api/stats` | GET | Dataset statistics |
| `/docs` | GET | Auto-generated FastAPI docs |

### `/api/analyze` request body

```json
{
  "note": "Patient clinical note text...",
  "top_k_patients": 10,
  "top_k_icd10": 15
}
```

---

## Technical details

### Hybrid retrieval

Reciprocal Rank Fusion per the PMC-Patients paper:

```
RRF_score(d) = Σ 1 / (k + rank_i(d))    k=60
```

- BM25 (top-50 candidates): exact term matching — catches drug names, lab values, dosages
- FAISS IndexFlatIP (top-50 candidates): cosine similarity in 768-dim embedding space
- Fused and reranked by RRF score, top-10 returned

### ICD-10 embedding

The `icd_10_embeddings.npy` file (if provided) uses a different embedding model. MedTrace re-embeds the top 10K ICD-10 descriptions using `nomic-embed-text-v1.5` for consistency with patient note embeddings. Both use the same 768-dim space, so cosine similarity is meaningful.

### Drug interaction engine

Two-layer approach:

1. **Rule layer (Python, deterministic):** checks every medication pair and drug-condition pair against hardcoded rules. Always fires — not affected by LLM output quality.
2. **LLM layer (qwen2.5-3b, temp=0):** runs a second pass for drug-condition interactions using the patient's actual ICD-10 codes. Results are deduplicated against rule-layer output.

Known pairs always caught by the rule layer:
- warfarin + amiodarone → CYP2C9 inhibition, INR elevation (critical)
- warfarin + aspirin → additive bleeding (critical)
- metformin + N18 CKD → lactic acidosis risk (critical)
- amiodarone + statin → rhabdomyolysis (warning)
- lisinopril + N18 CKD → hyperkalemia (warning)

### Admission risk

```
baseline_risk = max(ICD-10 chapter weights) × demographic_modifier × polypharmacy_modifier
```

Chapter weights are hardcoded from published literature. The LLM generates 3 forward scenarios (what changes if treatment/condition changes) — it receives the baseline score as context but cannot modify it.

### Cost index

```
cost_index = Σ (chapter_weight × icd10_confidence) + medication_overrides + demographic_modifier
```

Medication overrides for known high-cost drugs (amiodarone, chemotherapy agents, dialysis). Normalised to 0–100 and mapped to low/medium/high/critical tiers against CMS DRG benchmarks.

---

## Project structure

```
medtrace/
├── backend/
│   ├── main.py                  # FastAPI app + CORS
│   ├── config.py                # All hyperparameters in one place
│   ├── models/schemas.py        # Pydantic request/response models
│   ├── routers/
│   │   ├── analyze.py           # POST /api/analyze
│   │   ├── patients.py          # GET /api/patients/*
│   │   └── health.py            # GET /api/health
│   └── services/
│       ├── embedding_service.py     # nomic-embed-text-v1.5 via LM Studio
│       ├── retriever.py             # BM25 + FAISS + RRF fusion
│       ├── icd10_mapper.py          # ICD-10 FAISS nearest-neighbour
│       ├── medication_extractor.py  # NLP extraction, temp=0
│       ├── interaction_checker.py   # Rule engine + LLM second pass
│       ├── diagnosis_generator.py   # Chain-of-thought differential Dx
│       ├── admission_predictor.py   # Risk baseline + LLM scenarios
│       └── cost_analyzer.py         # CMS DRG mapping + LLM drivers
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app, auto-demo sequence
│   │   ├── api.ts               # Backend API client
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── components/
│   │       ├── DiagnosisCard.tsx
│   │       ├── InteractionAlerts.tsx
│   │       ├── SimilarPatients.tsx
│   │       ├── ICD10Matches.tsx
│   │       ├── AdmissionRisk.tsx
│   │       ├── CostAnalysis.tsx
│   │       ├── EvidenceChain.tsx
│   │       ├── LoadingProgress.tsx
│   │       ├── HowItWorks.tsx
│   │       └── DemoTour.tsx
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── build_patient_index.py   # Embeds 15K patients → FAISS + BM25
│   ├── build_icd10_index.py     # Embeds 10K ICD-10 codes → FAISS
│   └── explore_data.py          # Dataset statistics
├── data/
│   └── SCHEMA.md                # Data file schemas (files gitignored)
├── requirements.txt
├── start.sh
└── README.md
```
