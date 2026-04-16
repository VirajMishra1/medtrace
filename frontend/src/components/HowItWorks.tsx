import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Database, Cpu, Zap, TrendingUp, BarChart3,
  GitBranch, Shield, ChevronRight, Tag, Search,
  AlertTriangle, DollarSign, FileText, Activity,
} from "lucide-react";

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
  controlledTab?: string;
  scrollToDesign?: boolean;
}

/* ── Shared sub-components ─────────────────────────────────────────────────── */

const CodeChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code
    style={{
      fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
      fontSize: "11px",
      background: "rgba(14,165,233,0.08)",
      border: "1px solid rgba(14,165,233,0.15)",
      color: "#38bdf8",
      padding: "1px 6px",
      borderRadius: "4px",
    }}
  >
    {children}
  </code>
);

const MetricChip: React.FC<{ value: string; label: string; color?: string }> = ({
  value, label, color = "#0ea5e9",
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "10px 18px",
      background: `${color}08`,
      border: `1px solid ${color}18`,
      borderRadius: "8px",
      minWidth: "90px",
    }}
  >
    <span
      style={{
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: "20px",
        fontWeight: 700,
        color,
        lineHeight: 1,
        marginBottom: "4px",
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#556070",
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        textAlign: "center",
      }}
    >
      {label}
    </span>
  </div>
);

/* ── Module tab content ─────────────────────────────────────────────────────── */

const MODULES = [
  {
    id: "retrieval",
    icon: <Search size={14} />,
    label: "Hybrid Retrieval",
    color: "#0ea5e9",
    headline: "BM25 + FAISS with Reciprocal Rank Fusion",
    subhead: "Two search paradigms, fused into one ranked list — catching what pure semantic or lexical search miss alone",
    metrics: [
      { value: "167K", label: "Patient Records", color: "#0ea5e9" },
      { value: "50+50", label: "BM25+FAISS candidates", color: "#06b6d4" },
      { value: "RRF-60", label: "Fusion constant", color: "#38bdf8" },
    ],
    steps: [
      { label: "Embed query", detail: "nomic-embed-text-v1.5 produces a 768-dim dense vector for the clinical note. Truncated to 1500 chars to preserve meaningful clinical context." },
      { label: "BM25 lexical search", detail: "BM25Okapi searches a pre-tokenized corpus of 167K notes for exact term matches. Scores using term frequency × inverse document frequency. Returns top-50 candidates. Excels at specific drug names, lab values, exact diagnostic terms." },
      { label: "FAISS dense search", detail: "Inner-product search over the FAISS index (167K × 768 float32 vectors). Finds semantically similar cases even when exact words differ — catches 'elevated glucose' matching 'hyperglycaemia'. Returns top-50 candidates." },
      { label: "RRF fusion", detail: "Reciprocal Rank Fusion merges both ranked lists: score = Σ 1/(60 + rank). Final list ranked by combined score. RRF is parameter-robust — doesn't require normalising scores across two different scoring systems." },
      { label: "Return top-10", detail: "Top-10 fused candidates become the 'Similar Patients' panel. Their case notes also inform the LLM differential diagnosis as grounding evidence." },
    ],
    code: `# RRF fusion (retrieval_engine.py)
rrf_scores: dict[str, float] = {}
for rank, uid in enumerate(bm25_results):
    rrf_scores[uid] = rrf_scores.get(uid, 0) + 1 / (RRF_K + rank + 1)
for rank, uid in enumerate(faiss_results):
    rrf_scores[uid] = rrf_scores.get(uid, 0) + 1 / (RRF_K + rank + 1)
top = sorted(rrf_scores, key=rrf_scores.get, reverse=True)[:top_k]`,
  },
  {
    id: "icd10",
    icon: <Tag size={14} />,
    label: "ICD-10 Mapping",
    color: "#06b6d4",
    headline: "Semantic FAISS Search over 96,000 Diagnostic Codes",
    subhead: "The entire ICD-10 code hierarchy is embedded and indexed — any clinical description maps to the right codes",
    metrics: [
      { value: "96K+", label: "ICD-10 Codes", color: "#06b6d4" },
      { value: "768-dim", label: "nomic embeddings", color: "#0ea5e9" },
      { value: "Top-15", label: "Candidates returned", color: "#22d3ee" },
    ],
    steps: [
      { label: "Build offline index", detail: "At startup, all 96K ICD-10 descriptions are embedded using nomic-embed-text-v1.5 and stored in a FAISS flat index. This is a one-time operation — the index persists to disk." },
      { label: "Embed patient note", detail: "The patient note is embedded to the same 768-dim space. Crucially, because ICD-10 descriptions and clinical notes are both in natural language, the embedding space is shared." },
      { label: "Semantic k-NN", detail: "FAISS inner-product search retrieves the 15 most semantically similar ICD-10 descriptions. This handles synonyms, abbreviations, and clinical shorthand automatically." },
      { label: "Confidence scoring", detail: "Cosine similarity scores (0–1) are returned as 'confidence'. Scores above 0.7 are considered high-confidence matches. The top codes feed into risk scoring, cost analysis, and the LLM prompt." },
    ],
    code: `# ICD-10 search (icd10_retriever.py)
query_vec = embed_text(patient_note[:NOTE_EMBED_TRUNCATE])
scores, indices = faiss_index.search(query_vec, DEFAULT_TOP_K_ICD10)
matches = [ICD10Match(
    code=mapping[idx]["code"],
    description=mapping[idx]["description"],
    confidence=float(score),
) for score, idx in zip(scores[0], indices[0]) if score > 0]`,
  },
  {
    id: "medications",
    icon: <Zap size={14} />,
    label: "Medications + Interactions",
    color: "#f59e0b",
    headline: "NLP Extraction + Pharmacovigilance Safety Engine",
    subhead: "qwen2.5-3b extracts every drug with dose, frequency, route — then checks against 17 known critical interaction patterns",
    metrics: [
      { value: "Temp=0", label: "Deterministic output", color: "#f59e0b" },
      { value: "17+", label: "Dangerous combos checked", color: "#ef4444" },
      { value: "4 fields", label: "Per medication", color: "#f59e0b" },
    ],
    steps: [
      { label: "Exhaustive NLP extraction", detail: "Prompt instructs qwen2.5-3b to be exhaustive — 'do NOT skip any drug'. Lab values in parentheses (INR 2.1, HbA1c 8.2%) are explicitly excluded by example. Temperature=0 for fully deterministic, safety-critical extraction." },
      { label: "Structured JSON parsing", detail: "LLM outputs a JSON array with drug_name, dosage, frequency, route fields. Robust parser tries direct parse, then reversed [ search to find last valid array. Deduplication by drug name (case-normalized)." },
      { label: "Dosage contamination check", detail: "If the dosage field contains frequency words (daily, twice, PRN), it's moved to the frequency field. Prevents '5mg daily' being stored as dosage instead of '5mg'." },
      { label: "Pharmacovigilance check", detail: "Every medication pair and drug-condition combination is checked by a second LLM call. The prompt explicitly lists 17 known dangerous combinations including warfarin+amiodarone (critical INR elevation), opioids+benzodiazepines (respiratory depression), metformin+CKD (lactic acidosis)." },
    ],
    code: `# Interaction checker prompt (interaction_checker.py)
# Known critical combos listed explicitly:
# warfarin + amiodarone → INR elevation, bleeding (critical)
# opioids + benzodiazepines → respiratory depression (critical)
# metformin + eGFR<30 → lactic acidosis contraindicated (critical)
# QT-prolonging drugs combined → torsades de pointes (critical)
# ... 17 total patterns listed in prompt

temperature=0.0  # deterministic for patient safety
max_tokens=1500  # enough for all interactions`,
  },
  {
    id: "risk",
    icon: <TrendingUp size={14} />,
    label: "Admission Risk",
    color: "#10b981",
    headline: "Two-Phase: Rule-Based Scoring + LLM Scenario Simulation",
    subhead: "Deterministic ICD-10 severity weights establish a grounded baseline — LLM only generates forward scenarios from that anchor",
    metrics: [
      { value: "47+", label: "ICD-10 chapter weights", color: "#10b981" },
      { value: "3", label: "LLM scenarios per case", color: "#34d399" },
      { value: "4 factors", label: "Risk contributors", color: "#10b981" },
    ],
    steps: [
      { label: "ICD-10 chapter scoring", detail: "Each ICD-10 chapter maps to an evidence-based admission probability weight (e.g., I: Cardiovascular = 0.80, A41 Sepsis = 0.97, J80 ARDS = 0.97). Based on published hospitalization rate literature." },
      { label: "Aggregate: max + fractional sum", detail: "Final probability = max(top_weight) + Σ(remaining × 0.15). This avoids double-counting while acknowledging comorbidities add risk. Clamped to [0.0, 0.99]." },
      { label: "Demographic adjustment", detail: "Age ≥80: +0.18, Age 65–79: +0.10, Pediatric <5: +0.12, Young adult ≤25: −0.05. Male sex: +0.03 (higher CVD/sepsis literature). All additive modifiers to baseline." },
      { label: "Medication complexity", detail: "High-acuity medications (warfarin, vancomycin, vasopressors, immunosuppressants) add up to +0.12. Polypharmacy ≥5 drugs adds +0.02 per extra drug up to +0.08." },
      { label: "LLM scenario simulation", detail: "qwen2.5-3b receives the calculated probability + top conditions + medications and generates 3 clinically specific scenarios: deterioration, treatment response, full recovery. New probabilities are independently recalculated, not trusted from LLM output." },
    ],
    code: `# Admission scoring (admission_predictor.py)
# Phase 1: rule-based (deterministic)
top = max(weighted_scores)
rest = sum(w * 0.15 for w in sorted(weights, reverse=True)[1:4])
base_prob = min(0.99, top + rest)

# Phase 2: delta always recalculated, never from LLM
new_prob = max(0.0, min(0.99, float(item["new_probability"])))
delta = round(new_prob - prob, 3)  # LLM delta ignored`,
  },
  {
    id: "cost",
    icon: <DollarSign size={14} />,
    label: "Cost & Utilization",
    color: "#a78bfa",
    headline: "CMS DRG-Based Cost Modeling + LLM Driver Analysis",
    subhead: "Rule-based cost index from ICD-10 chapter × CMS DRG data, with LLM identifying specific reduction opportunities",
    metrics: [
      { value: "4 tiers", label: "Low/Med/High/Critical", color: "#a78bfa" },
      { value: "18+", label: "High-cost drug scores", color: "#c4b5fd" },
      { value: "3 settings", label: "ICU/Ward/Outpatient", color: "#a78bfa" },
    ],
    steps: [
      { label: "Chapter cost tier", detail: "ICD-10 chapters map to cost tiers from CMS DRG data: C (Neoplasms) = critical, I (Cardiovascular) = critical, F (Mental health) = low. Specific high-cost codes override chapter (J80 ARDS = 95/100, A41 Sepsis = 95/100, I21 Acute MI = 92/100)." },
      { label: "Medication cost contribution", detail: "18 high-cost medications scored individually (nivolumab=92, vancomycin=60, insulin=40). Polypharmacy ≥5 drugs adds 3 points per extra drug. Age ≥75 adds 8 points; young adult ≤25 gets −5 discount." },
      { label: "Utilization prediction", detail: "Cost index drives setting probability: ≥85 or ICU-code → 70% ICU / 25% Ward. 65–84 → 30% ICU / 58% Ward. 40–64 → 8% ICU / 55% Ward. Each band has LOS min/max estimates." },
      { label: "LLM cost driver analysis", detail: "Receives full patient profile and cost index. Outputs specific cost drivers with percentage contributions (e.g., 'ICU ventilator support: 38%'), reduction opportunities (e.g., antibiotic stewardship), and a clinical cost narrative." },
    ],
    code: `# Cost index (cost_analyzer.py)
# High-cost code overrides (CMS DRG data):
_HIGH_COST_CODES = {
    'J80': ('ARDS — ICU + ventilator', 95),
    'A41': ('Sepsis — ICU + broad-spectrum antibiotics', 95),
    'I21': ('Acute MI — cath lab / PCI / CABG', 92),
    ...
}
# Young adult discount, age premium
age_score = 8.0 if age >= 75 else 4.0 if age >= 65 else -5.0 if age <= 25 else 0`,
  },
];

const PIPELINE_STAGES = [
  { n: "01", label: "Note Input",        sub: "Unstructured text",   color: "#0ea5e9", icon: <FileText size={12} /> },
  { n: "02", label: "Embed + Index",     sub: "nomic-embed-text",    color: "#06b6d4", icon: <Database size={12} /> },
  { n: "03", label: "Hybrid Retrieval",  sub: "BM25 + FAISS + RRF",  color: "#38bdf8", icon: <Search size={12} /> },
  { n: "04", label: "ICD-10 Mapping",    sub: "96K codes, FAISS",    color: "#22d3ee", icon: <Tag size={12} /> },
  { n: "05", label: "NLP Extraction",    sub: "qwen2.5-3b-instruct", color: "#f59e0b", icon: <Cpu size={12} /> },
  { n: "06", label: "Interactions",      sub: "Pharmacovigilance",   color: "#ef4444", icon: <AlertTriangle size={12} /> },
  { n: "07", label: "Risk + Cost",       sub: "Rule + LLM simulation",color: "#10b981", icon: <TrendingUp size={12} /> },
  { n: "08", label: "Report",            sub: "Structured output",   color: "#a78bfa", icon: <Activity size={12} /> },
];

const DESIGN_DECISIONS = [
  {
    title: "100% Local Inference",
    body: "Patient notes are clinical-grade PHI. Every model (nomic-embed-text, qwen2.5-3b) runs through LM Studio on-device. Zero data leaves the machine — compliant with HIPAA's 'minimum necessary' principle by default.",
    icon: <Shield size={14} />,
    color: "#10b981",
  },
  {
    title: "Rule-Based Anchoring",
    body: "Admission risk and cost models are grounded in deterministic ICD-10 chapter weights from published literature, not pure LLM guesses. The LLM only fills in forward scenarios and narrative — never the safety-critical probability.",
    icon: <GitBranch size={14} />,
    color: "#0ea5e9",
  },
  {
    title: "Hybrid Retrieval over Pure Semantic",
    body: "BM25 catches exact drug names and lab values that semantic search dilutes. FAISS catches synonyms and conceptual matches. RRF fusion is parameter-robust — no score normalisation needed across two different scoring systems.",
    icon: <Search size={14} />,
    color: "#06b6d4",
  },
  {
    title: "Temperature=0 for Safety Tasks",
    body: "Medication extraction and drug interaction detection run at temperature=0 — fully deterministic. Clinical decision support cannot afford hallucination variability. Only the narrative sections (diagnosis reasoning, scenarios) use temperature=0.3.",
    icon: <Zap size={14} />,
    color: "#f59e0b",
  },
  {
    title: "Validated Evidence, Not Fabricated",
    body: "Similar patient UIDs and ICD-10 codes in the evidence chain are validated against actual retrieval results before being shown. The LLM cannot hallucinate a patient that doesn't exist in the PMC-Patients corpus.",
    icon: <Database size={14} />,
    color: "#a78bfa",
  },
  {
    title: "qwen2.5-3b: Deliberately Small",
    body: "A 3B-parameter model fits on any laptop GPU. The prompt engineering compensates: exhaustive instructions, concrete examples, explicit negative rules (e.g., 'INR 2.1 is NOT a medication'). Smaller + better prompts > larger + worse prompts for structured output tasks.",
    icon: <Cpu size={14} />,
    color: "#38bdf8",
  },
];

/* ── Main component ─────────────────────────────────────────────────────────── */

const HowItWorks: React.FC<HowItWorksProps> = ({ isOpen, onClose, controlledTab, scrollToDesign }) => {
  const [activeModule, setActiveModule] = useState("retrieval");
  const designRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (controlledTab) setActiveModule(controlledTab);
  }, [controlledTab]);

  React.useEffect(() => {
    if (scrollToDesign && designRef.current) {
      designRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [scrollToDesign]);

  const module = MODULES.find((m) => m.id === activeModule)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(7,7,13,0.97)",
            backdropFilter: "blur(12px)",
            overflowY: "auto",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 80px" }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "40px",
              }}
            >
              <div>
                <div className="phase-label" style={{ marginBottom: "10px" }}>
                  Architecture — Deep Dive
                </div>
                <h1
                  style={{
                    fontSize: "36px",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#e8eef7",
                    lineHeight: 1.1,
                    marginBottom: "10px",
                  }}
                >
                  How MedTrace Works
                </h1>
                <p style={{ fontSize: "14px", color: "#556070", maxWidth: "600px", lineHeight: 1.7 }}>
                  A clinical intelligence pipeline built on 167K real patient records, hybrid retrieval,
                  and four specialized AI modules — all running locally with zero external API calls.
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  color: "#556070",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "4px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e8eef7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#556070"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* System metrics */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "40px",
                flexWrap: "wrap",
              }}
            >
              {[
                { v: "167,442",  l: "Patient Records",    c: "#0ea5e9" },
                { v: "96,000+",  l: "ICD-10 Codes",       c: "#06b6d4" },
                { v: "768-dim",  l: "Embedding Space",    c: "#38bdf8" },
                { v: "4",        l: "AI Modules",         c: "#10b981" },
                { v: "2",        l: "LLM Prompts / run",  c: "#f59e0b" },
                { v: "Temp=0",   l: "Safety-Critical",    c: "#ef4444" },
                { v: "100%",     l: "Local Inference",    c: "#a78bfa" },
              ].map((m) => (
                <MetricChip key={m.l} value={m.v} label={m.l} color={m.c} />
              ))}
            </div>

            {/* Pipeline flowchart */}
            <div className="phase-label" style={{ marginBottom: "16px" }}>
              Full Pipeline — Input to Output
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                marginBottom: "40px",
                overflowX: "auto",
                paddingBottom: "8px",
              }}
            >
              {PIPELINE_STAGES.map((stage, i) => (
                <React.Fragment key={stage.n}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: `${stage.color}10`,
                        border: `1px solid ${stage.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: stage.color,
                      }}
                    >
                      {stage.icon}
                    </div>
                    <div
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "8px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: stage.color,
                        textAlign: "center",
                        maxWidth: "70px",
                      }}
                    >
                      {stage.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "7px",
                        color: "#2a3040",
                        textAlign: "center",
                        maxWidth: "70px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {stage.sub}
                    </div>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 4px",
                        flexShrink: 0,
                        marginBottom: "18px",
                      }}
                    >
                      <div style={{ width: "16px", height: "1px", background: "rgba(255,255,255,0.06)" }} />
                      <ChevronRight size={10} color="rgba(255,255,255,0.08)" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Module deep dives */}
            <div className="phase-label" style={{ marginBottom: "16px" }}>
              Module Deep Dives — Click to explore
            </div>

            {/* Module tabs */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 14px",
                    background: activeModule === m.id ? `${m.color}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${activeModule === m.id ? `${m.color}30` : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "7px",
                    cursor: "pointer",
                    color: activeModule === m.id ? m.color : "#556070",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    transition: "all 0.15s ease",
                    fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ color: activeModule === m.id ? m.color : "#2a3040" }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Active module content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${module.color}18`,
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "32px",
                }}
              >
                {/* Module header */}
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: `1px solid ${module.color}10`,
                    background: `${module.color}05`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px" }}>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ color: module.color }}>{module.icon}</span>
                        <span
                          style={{
                            fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: module.color,
                          }}
                        >
                          {module.label}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#e8eef7",
                          letterSpacing: "-0.02em",
                          marginBottom: "6px",
                        }}
                      >
                        {module.headline}
                      </h3>
                      <p style={{ fontSize: "12px", color: "#556070", lineHeight: 1.6 }}>
                        {module.subhead}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {module.metrics.map((met) => (
                        <MetricChip key={met.label} value={met.value} label={met.label} color={met.color} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Steps + code */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                  {/* Steps */}
                  <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="section-label" style={{ marginBottom: "14px" }}>
                      How It Works — Step by Step
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {module.steps.map((step, i) => (
                        <div key={i} style={{ display: "flex", gap: "12px" }}>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "5px",
                              background: `${module.color}12`,
                              border: `1px solid ${module.color}22`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                              fontSize: "9px",
                              fontWeight: 700,
                              color: module.color,
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#c8d4e0",
                                marginBottom: "4px",
                                letterSpacing: "0.01em",
                              }}
                            >
                              {step.label}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#556070",
                                lineHeight: "1.65",
                              }}
                            >
                              {step.detail}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code snippet */}
                  <div style={{ padding: "20px 24px" }}>
                    <div className="section-label" style={{ marginBottom: "14px" }}>
                      Source Code Reference
                    </div>
                    <pre
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "11px",
                        lineHeight: "1.75",
                        color: "#556070",
                        background: "rgba(7,7,13,0.8)",
                        border: "1px solid rgba(14,165,233,0.06)",
                        borderRadius: "8px",
                        padding: "16px",
                        overflow: "auto",
                        maxHeight: "260px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {module.code.split("\n").map((line, i) => {
                        const isComment = line.trim().startsWith("#");
                        const isKey = line.includes("def ") || line.includes("return ") || line.includes("class ");
                        return (
                          <div
                            key={i}
                            style={{
                              color: isComment ? "#2a3040" : isKey ? "#38bdf8" : "#94a3b8",
                            }}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Design decisions */}
            <div ref={designRef} className="phase-label" style={{ marginBottom: "16px" }}>
              Design Decisions — Why We Built It This Way
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "40px",
              }}
            >
              {DESIGN_DECISIONS.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    padding: "16px",
                    background: "var(--bg-card)",
                    border: "1px solid rgba(255,255,255,0.045)",
                    borderRadius: "10px",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        background: `${d.color}10`,
                        border: `1px solid ${d.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: d.color,
                        flexShrink: 0,
                      }}
                    >
                      {d.icon}
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#c8d4e0",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {d.title}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#556070", lineHeight: "1.65" }}>
                    {d.body}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Tech stack */}
            <div className="phase-label" style={{ marginBottom: "16px" }}>
              Tech Stack
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              {[
                { layer: "Frontend",     items: ["React 18", "TypeScript", "framer-motion", "lucide-react", "Tailwind CSS"] },
                { layer: "Backend",      items: ["FastAPI", "Python 3.11", "Pydantic v2", "uvicorn", "asyncio"] },
                { layer: "AI / Models",  items: ["qwen2.5-3b-instruct", "nomic-embed-text-v1.5", "LM Studio", "openai SDK"] },
                { layer: "Data / Index", items: ["PMC-Patients (167K)", "FAISS flat index", "BM25Okapi", "ICD-10 (96K)", "Parquet + JSON"] },
              ].map((stack) => (
                <div
                  key={stack.layer}
                  style={{
                    padding: "14px",
                    background: "var(--bg-card)",
                    border: "1px solid rgba(255,255,255,0.045)",
                    borderRadius: "10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#0ea5e9",
                      marginBottom: "10px",
                    }}
                  >
                    {stack.layer}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {stack.items.map((item) => (
                      <div
                        key={item}
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "1px",
                            background: "rgba(14,165,233,0.3)",
                            flexShrink: 0,
                          }}
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HowItWorks;
