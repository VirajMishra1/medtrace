import React, { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";
import Navbar from "./components/Navbar";
import PatientInput from "./components/PatientInput";
import LoadingProgress from "./components/LoadingProgress";
import DiagnosisCard from "./components/DiagnosisCard";
import InteractionAlerts from "./components/InteractionAlerts";
import SimilarPatients from "./components/SimilarPatients";
import ICD10Matches from "./components/ICD10Matches";
import MedicationTable from "./components/MedicationTable";
import EvidenceChain from "./components/EvidenceChain";
import MethodologyModal from "./components/MethodologyModal";
import HowItWorks from "./components/HowItWorks";
import DemoTour, { DemoStep } from "./components/DemoTour";
import AdmissionRisk from "./components/AdmissionRisk";
import CostAnalysis from "./components/CostAnalysis";
import { analyzePatient, getHealth, getSamplePatients } from "./api";
import { AnalysisResponse, HealthStatus, PatientRecord } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, Pill, Zap, Users, Tag,
  TrendingUp, BarChart3, GitBranch, AlertTriangle,
  Activity, Database, Shield, Play,
} from "lucide-react";

/* ── Demo case ──────────────────────────────────────────────────────────────── */
const DEMO_NOTE = `A 72-year-old female with atrial fibrillation, type 2 diabetes mellitus, and hypertension presents with increasing fatigue and dyspnea on exertion. Current medications include warfarin 5mg daily (INR 2.4), metformin 1000mg twice daily, lisinopril 10mg daily, aspirin 81mg daily, atorvastatin 40mg at bedtime, and amiodarone 200mg daily. Recent labs show elevated creatinine (1.8 mg/dL) and HbA1c 8.2%. ECG shows controlled ventricular rate of 78 bpm. She reports occasional mild hypoglycemic episodes.`;

/* ── Demo sequence definition ────────────────────────────────────────────────── */
interface RawStep {
  label: string;
  phase: string;
  voiceover: string;
  duration: number;
  action: string;
}

const DEMO_SEQUENCE: RawStep[] = [
  // Phase 1: Architecture overview
  { label: "OPENING ARCHITECTURE OVERVIEW", phase: "HOW IT WORKS", duration: 2500,
    action: "open-how",
    voiceover: "Let's start with the technical architecture — four AI modules built on 167,000 real patient records." },
  { label: "HYBRID RETRIEVAL — BM25 + FAISS + RRF", phase: "HOW IT WORKS", duration: 7000,
    action: "tab:retrieval",
    voiceover: "The retrieval system combines two search indexes. BM25 catches exact drug names and lab values. FAISS finds semantic matches — so 'elevated glucose' retrieves 'hyperglycaemia' cases. Reciprocal Rank Fusion merges the two ranked lists." },
  { label: "ICD-10 SEMANTIC MAPPING — 96K CODES", phase: "HOW IT WORKS", duration: 6000,
    action: "tab:icd10",
    voiceover: "All 96,000 ICD-10 diagnostic codes are embedded and FAISS-indexed. Any clinical description maps to the right codes without explicit lookups — purely semantic similarity." },
  { label: "MEDICATION EXTRACTION + PHARMACOVIGILANCE", phase: "HOW IT WORKS", duration: 7000,
    action: "tab:medications",
    voiceover: "Medication extraction runs at temperature zero — fully deterministic, because this is safety-critical. The pharmacovigilance engine explicitly checks against 17 known dangerous drug combinations including warfarin-amiodarone and opioids with benzodiazepines." },
  { label: "ADMISSION RISK SIMULATION", phase: "HOW IT WORKS", duration: 6000,
    action: "tab:risk",
    voiceover: "Admission risk uses ICD-10 chapter severity weights from published literature as a deterministic anchor. Sepsis scores 0.97, acute MI scores 0.97, ARDS scores 0.97. The LLM only generates forward scenarios — never the safety-critical baseline." },
  { label: "HEALTHCARE COST MODELING", phase: "HOW IT WORKS", duration: 6000,
    action: "tab:cost",
    voiceover: "Cost modeling maps ICD-10 chapters to CMS DRG cost tiers, with specific overrides for high-cost codes. The LLM identifies specific reduction opportunities like antibiotic stewardship and early discharge planning." },
  { label: "DESIGN DECISIONS — LOCAL INFERENCE", phase: "HOW IT WORKS", duration: 6000,
    action: "scroll-design",
    voiceover: "Every model runs locally through LM Studio — no patient data leaves the machine. This is HIPAA-compliant by architecture, not by policy." },
  { label: "CLOSING ARCHITECTURE VIEW", phase: "HOW IT WORKS", duration: 2000,
    action: "close-how",
    voiceover: "" },

  // Phase 2: Input & pipeline
  { label: "PLATFORM OVERVIEW — 167K RECORDS", phase: "PLATFORM", duration: 4000,
    action: "scroll-top",
    voiceover: "Back to the main interface. 167,000 patient records, 96,000 ICD-10 codes, four AI modules, 100 percent local inference." },
  { label: "REAL DATABASE PATIENT — PMC CORPUS", phase: "INPUT", duration: 4500,
    action: "load-db-case",
    voiceover: "The dropdown pulls live from the database — any of the 167,000 real patients. Here's an actual PMC case loaded directly from the index." },
  { label: "LOADING POLYPHARMACY DEMO CASE", phase: "INPUT", duration: 4000,
    action: "load-case",
    voiceover: "Loading a complex polypharmacy case — a 72-year-old with atrial fibrillation on six medications including warfarin, amiodarone, and aspirin. This combination is a known pharmacovigilance emergency." },
  { label: "INITIATING 6-STAGE PIPELINE", phase: "INPUT", duration: 1500,
    action: "run-analysis",
    voiceover: "Initiating the pipeline. Six stages will run — embedding, retrieval, ICD-10 mapping, medication extraction, interaction checking, and diagnosis generation." },

  // Phase 3: Results tour
  { label: "INTELLIGENCE REPORT — ACTIVE", phase: "PHASE I", duration: 4500,
    action: "scroll:demo-report",
    voiceover: "The intelligence report is now active. Four modules completed in a single pass. You can see the module summary chips — diagnoses, medications, interaction alerts, and similar patients." },
  { label: "DIFFERENTIAL DIAGNOSES", phase: "PHASE I", duration: 8000,
    action: "expand-diagnosis",
    voiceover: "Differential diagnoses ranked by confidence. The top result is expanded — showing clinical reasoning, key concerns including elevated creatinine and INR 2.4, and the validated evidence patient UIDs from the PMC corpus." },
  { label: "EXTRACTED MEDICATIONS", phase: "PHASE I", duration: 6000,
    action: "scroll:demo-medications",
    voiceover: "Six medications extracted structurally with drug name, dosage, frequency, and route. Warfarin 5mg daily, metformin 1000mg twice daily, amiodarone 200mg daily — the full polypharmacy profile." },
  { label: "CRITICAL DRUG INTERACTIONS", phase: "PHASE I", duration: 8000,
    action: "expand-interaction",
    voiceover: "Critical interaction detected: warfarin plus amiodarone. Amiodarone inhibits CYP2C9, causing major INR elevation and serious bleeding risk — a known pharmacovigilance emergency that needs immediate clinical review. Click to see the full recommendation." },
  { label: "SIMILAR PATIENT RECORDS — 167K CORPUS", phase: "PHASE II", duration: 6000,
    action: "expand-patient",
    voiceover: "Phase Two: patient intelligence. These are the ten most similar historical cases retrieved from 167,000 records using hybrid BM25 plus FAISS search. Expand any case to read the full clinical note that grounded the diagnosis." },
  { label: "ICD-10 SEMANTIC MATCHES", phase: "PHASE II", duration: 5500,
    action: "scroll:demo-icd10",
    voiceover: "ICD-10 semantic mapping identified codes for atrial fibrillation, type 2 diabetes, hypertension, and chronic kidney disease — with no explicit code input, purely through semantic similarity over 96,000 indexed codes." },
  { label: "ADMISSION RISK SIMULATION", phase: "PHASE III", duration: 8000,
    action: "scroll:demo-risk",
    voiceover: "Phase Three: operational forecast. High-tier admission risk, driven by cardiovascular ICD-10 chapter weight, polypharmacy score, and age-based demographic modifiers. Three LLM-generated scenarios show the forward clinical trajectory." },
  { label: "COST & UTILIZATION ANALYSIS", phase: "PHASE III", duration: 8000,
    action: "scroll:demo-cost",
    voiceover: "High-cost tier driven by amiodarone and cardiovascular primary diagnosis. The LLM identifies specific cost drivers with percentage contributions and actionable reduction opportunities including antibiotic stewardship." },
  { label: "EVIDENCE CHAIN — VALIDATED PROVENANCE", phase: "PHASE IV", duration: 7000,
    action: "scroll:demo-evidence",
    voiceover: "Phase Four: the full evidence chain. Every diagnosis is traced to validated patient UIDs and ICD-10 codes. The system cross-checks every cited ID against actual retrieval results — it cannot hallucinate evidence that was never retrieved." },
  { label: "DEMO COMPLETE", phase: "COMPLETE", duration: 0,
    action: "done",
    voiceover: "MedTrace — clinical intelligence at the point of care. 167,000 patient records. Four AI modules. Entirely local. Under 30 seconds." },
];

/* ── Section header ─────────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ReactNode> = {
  "Differential Diagnoses":      <Stethoscope size={12} />,
  "Extracted Medications":       <Pill size={12} />,
  "Interaction Alerts":          <Zap size={12} />,
  "Similar Patients":            <Users size={12} />,
  "ICD-10 Matches":              <Tag size={12} />,
  "Admission Risk Simulation":   <TrendingUp size={12} />,
  "Cost & Utilization Analysis": <BarChart3 size={12} />,
  "Evidence Chain":              <GitBranch size={12} />,
};

const SectionHeader: React.FC<{ title: string; count?: number; accentColor?: string }> = ({
  title, count, accentColor = "#0ea5e9",
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
      paddingBottom: "11px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
      <div
        style={{
          width: "26px",
          height: "26px",
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}22`,
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {ICON_MAP[title] ?? <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: accentColor }} />}
      </div>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#c8d4e0",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        }}
      >
        {title}
      </span>
    </div>
    {count !== undefined && (
      <span
        style={{
          fontSize: "10px",
          color: accentColor,
          background: `${accentColor}0e`,
          padding: "2px 9px",
          borderRadius: "4px",
          border: `1px solid ${accentColor}18`,
          fontWeight: 700,
          fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
          letterSpacing: "0.05em",
        }}
      >
        {count}
      </span>
    )}
  </div>
);

/* ── Phase divider ───────────────────────────────────────────────────────────── */
const PhaseLabel: React.FC<{ phase: string; label: string; color?: string }> = ({
  phase, label, color = "#0ea5e9",
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "14px",
      marginTop: "8px",
    }}
  >
    <span
      style={{
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {phase} ——
    </span>
    <span
      style={{
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.22)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
    <div
      style={{
        flex: 1,
        height: "1px",
        background: `linear-gradient(90deg, ${color}25, transparent)`,
      }}
    />
  </div>
);

/* ── Hero section ───────────────────────────────────────────────────────────── */
const HeroSection: React.FC<{ health: HealthStatus | null }> = ({ health }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    style={{
      padding: "52px 0 44px",
      textAlign: "center",
      position: "relative",
    }}
  >
    {/* Top annotation */}
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "20px",
        padding: "5px 14px",
        background: "rgba(14,165,233,0.06)",
        border: "1px solid rgba(14,165,233,0.15)",
        borderRadius: "4px",
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "#38bdf8",
      }}
    >
      <div
        className="pulse-dot"
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: "#0ea5e9",
          color: "#0ea5e9",
        }}
      />
      Palantir Build Challenge — Healthcare AI
    </div>

    {/* Main headline */}
    <h1
      style={{
        fontSize: "clamp(32px, 5vw, 52px)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        color: "#e8eef7",
        marginBottom: "8px",
      }}
    >
      Clinical Intelligence
      <br />
      <span
        style={{
          background: "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #38bdf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        at the Point of Care
      </span>
    </h1>

    {/* Subtitle */}
    <p
      style={{
        fontSize: "14px",
        color: "#556070",
        maxWidth: "560px",
        margin: "16px auto 32px",
        lineHeight: 1.7,
        letterSpacing: "0.01em",
      }}
    >
      MedTrace turns unstructured clinical notes into structured intelligence —
      differential diagnoses, drug interaction detection, admission risk simulation,
      and cost modelling. All running locally, all in seconds.
    </p>

    {/* Stats row */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      {[
        { icon: <Database size={11} />, value: (health?.patient_count ?? 167442).toLocaleString(), label: "Patient Records", color: "#0ea5e9" },
        { icon: <Tag size={11} />,      value: (health?.icd10_count  ?? 96000).toLocaleString() + "+", label: "ICD-10 Codes",    color: "#06b6d4" },
        { icon: <Activity size={11} />, value: "4",                                                   label: "AI Modules",      color: "#38bdf8" },
        { icon: <Shield size={11} />,   value: "100%",                                                label: "Local Inference", color: "#0ea5e9" },
      ].map((s, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              background: `${s.color}08`,
              border: `1px solid ${s.color}18`,
              borderRadius: "6px",
            }}
          >
            <span style={{ color: s.color }}>{s.icon}</span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#e8eef7",
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              }}
            >
              {s.value}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "#556070",
                letterSpacing: "0.05em",
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </span>
          </div>
          {i < 3 && (
            <span
              style={{
                color: "rgba(255,255,255,0.08)",
                fontSize: "16px",
                fontWeight: 300,
              }}
            >
              /
            </span>
          )}
        </React.Fragment>
      ))}
    </div>

    {/* Module pipeline illustration */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
        marginTop: "28px",
        flexWrap: "wrap",
      }}
    >
      {[
        { label: "Hybrid Retrieval", sub: "BM25 + FAISS", color: "#0ea5e9" },
        { label: "ICD-10 Mapping", sub: "Semantic + nomic", color: "#06b6d4" },
        { label: "Drug Interactions", sub: "Pharmacovigilance", color: "#f59e0b" },
        { label: "Risk + Cost", sub: "Simulation engine", color: "#10b981" },
      ].map((m, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${m.color}15`,
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: m.color,
                letterSpacing: "0.04em",
                marginBottom: "2px",
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#2a3040",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              }}
            >
              {m.sub}
            </div>
          </div>
          {i < 3 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 4px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <div
                style={{
                  width: "0",
                  height: "0",
                  borderTop: "3px solid transparent",
                  borderBottom: "3px solid transparent",
                  borderLeft: "5px solid rgba(255,255,255,0.06)",
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>

    {/* Divider */}
    <div className="intel-sep" style={{ marginTop: "40px", marginBottom: "0" }} />
  </motion.div>
);

/* ── App ─────────────────────────────────────────────────────────────────────── */
function App() {
  const [health, setHealth]               = useState<HealthStatus | null>(null);
  const [samplePatients, setSamplePatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [result, setResult]               = useState<AnalysisResponse | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [liveSteps, setLiveSteps]         = useState<string[]>([]);
  const [currentStep, setCurrentStep]     = useState("");
  const [showMethodology, setShowMethodology] = useState(false);
  const [showHowItWorks, setShowHowItWorks]   = useState(false);

  // ── Demo tour state ──────────────────────────────────────────────────────────
  const [demoRunning,        setDemoRunning]        = useState(false);
  const [demoStepData,       setDemoStepData]        = useState<DemoStep | null>(null);
  const [demoNote,           setDemoNote]            = useState<string | undefined>(undefined);
  const [howItWorksTab,      setHowItWorksTab]       = useState<string | undefined>(undefined);
  const [howItWorksScroll,   setHowItWorksScroll]    = useState(false);
  const [demoExpandDiag,     setDemoExpandDiag]      = useState(false);
  const [demoExpandInteract, setDemoExpandInteract]  = useState<number | undefined>(undefined);
  const [demoExpandPatient,  setDemoExpandPatient]   = useState(false);
  const [awaitingResult,     setAwaitingResult]      = useState(false);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demoStepRef = useRef(0);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch {
        setHealth({
          status: "error",
          lmstudio_connected: false,
          patient_index_loaded: false,
          icd10_index_loaded: false,
          bm25_index_loaded: false,
          patient_count: 0,
          icd10_count: 0,
          details: {},
        });
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getSamplePatients(12).then(setSamplePatients).catch(() => setSamplePatients([]));
  }, []);

  const handleAnalyze = useCallback(async (note: string) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setLiveSteps([]);
    setCurrentStep("Embedding patient note");
    setAnalysisTimestamp(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");

    const steps = [
      "Embedding patient note",
      "Retrieving similar patients",
      "Mapping ICD-10 codes",
      "Extracting medications",
      "Checking interactions",
      "Generating diagnoses",
    ];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setCurrentStep(steps[stepIdx]);
        setLiveSteps((prev) => [...prev, steps[stepIdx]]);
        stepIdx++;
      }
    }, 4000);

    try {
      const data = await analyzePatient(note);
      clearInterval(stepInterval);
      setLiveSteps(data.processing_steps);
      setCurrentStep("Analysis complete");
      setResult(data);
    } catch (e: any) {
      clearInterval(stepInterval);
      setError(e?.response?.data?.detail || e?.message || "Analysis failed. Check that the backend is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const criticalAlerts = result?.interactions.filter((i) => i.severity === "critical").length ?? 0;

  /* ── Demo helpers ─────────────────────────────────────────────────────────── */
  const demoScrollTo = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  const stopDemo = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setDemoRunning(false);
    setDemoStepData(null);
    setAwaitingResult(false);
    setHowItWorksTab(undefined);
    setHowItWorksScroll(false);
    setDemoExpandDiag(false);
    setDemoExpandInteract(undefined);
    setDemoExpandPatient(false);
    setShowHowItWorks(false);
  }, []);

  const runResultsTour = useCallback(() => {
    // Steps after analysis completes — these are result-dependent
    const POST: RawStep[] = DEMO_SEQUENCE.slice(12); // steps 12 onwards
    let t = 0;
    const total = DEMO_SEQUENCE.length;

    POST.forEach((step, relIdx) => {
      const absIdx = 12 + relIdx;
      const progress = Math.round(((absIdx + 1) / total) * 100);

      demoTimers.current.push(setTimeout(() => {
        setDemoStepData({
          stepNum: absIdx + 1,
          totalSteps: total,
          label: step.label,
          phase: step.phase,
          voiceover: step.voiceover,
          progress,
        });

        if (step.action.startsWith("scroll:")) {
          demoScrollTo(step.action.replace("scroll:", ""));
        } else if (step.action === "expand-diagnosis") {
          demoScrollTo("demo-diagnoses");
          setTimeout(() => setDemoExpandDiag(true), 600);
        } else if (step.action === "expand-interaction") {
          demoScrollTo("demo-interactions");
          setTimeout(() => setDemoExpandInteract(0), 600);
        } else if (step.action === "expand-patient") {
          demoScrollTo("demo-patients");
          setTimeout(() => setDemoExpandPatient(true), 600);
        } else if (step.action === "done") {
          setTimeout(() => stopDemo(), 3000);
        }
      }, t));

      t += step.duration;
    });
  }, [stopDemo]);

  // Watch for analysis result to arrive during demo
  useEffect(() => {
    if (awaitingResult && result && !isLoading) {
      setAwaitingResult(false);
      // Brief pause then start results tour
      demoTimers.current.push(setTimeout(runResultsTour, 1200));
    }
  }, [awaitingResult, result, isLoading, runResultsTour]);

  const startDemo = useCallback(() => {
    // Reset everything
    stopDemo();
    setResult(null);
    setError(null);
    setDemoExpandDiag(false);
    setDemoExpandInteract(undefined);
    setDemoExpandPatient(false);
    setDemoRunning(true);
    demoStepRef.current = 0;

    const PRE = DEMO_SEQUENCE.slice(0, 12);
    const total = DEMO_SEQUENCE.length;
    let t = 0;

    PRE.forEach((step, i) => {
      const progress = Math.round(((i + 1) / total) * 100);

      demoTimers.current.push(setTimeout(() => {
        setDemoStepData({
          stepNum: i + 1,
          totalSteps: total,
          label: step.label,
          phase: step.phase,
          voiceover: step.voiceover,
          progress,
        });

        if (step.action === "open-how") {
          setShowHowItWorks(true);
          setHowItWorksTab("retrieval");
          setHowItWorksScroll(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (step.action.startsWith("tab:")) {
          setHowItWorksTab(step.action.replace("tab:", ""));
          setHowItWorksScroll(false);
        } else if (step.action === "scroll-design") {
          setHowItWorksScroll(true);
        } else if (step.action === "close-how") {
          setShowHowItWorks(false);
          setHowItWorksTab(undefined);
          setHowItWorksScroll(false);
        } else if (step.action === "scroll-top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (step.action === "load-db-case") {
          const dbPatient = samplePatients[0];
          if (dbPatient) {
            setDemoNote(dbPatient.snippet);
            demoScrollTo("demo-input");
          }
        } else if (step.action === "load-case") {
          setDemoNote(DEMO_NOTE);
          demoScrollTo("demo-input");
        } else if (step.action === "run-analysis") {
          setAwaitingResult(true);
          handleAnalyze(DEMO_NOTE);
          demoScrollTo("demo-loading");
        }
      }, t));

      t += step.duration;
    });
  }, [stopDemo, handleAnalyze]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", position: "relative", zIndex: 1 }}>
      <Navbar health={health} onHowItWorks={() => setShowHowItWorks(true)} onStartDemo={startDemo} demoRunning={demoRunning} />

      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px 48px" }}>

        {/* Hero section */}
        <HeroSection health={health} />

        {/* Input */}
        <div id="demo-input">
          <PatientInput onAnalyze={handleAnalyze} isLoading={isLoading} samplePatients={samplePatients} demoNote={demoNote} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                padding: "13px 16px",
                marginBottom: "20px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.22)",
                background: "rgba(239,68,68,0.04)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600,
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace", letterSpacing: "0.02em" }}>
                {error}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <div id="demo-loading">
          <AnimatePresence>
            {isLoading && <LoadingProgress steps={liveSteps} currentStep={currentStep} />}
          </AnimatePresence>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Intelligence Report header */}
              <motion.div
                id="demo-report"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  background: "rgba(14,165,233,0.04)",
                  border: "1px solid rgba(14,165,233,0.12)",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 12px rgba(14,165,233,0.3)",
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={13} color="white" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#38bdf8",
                        marginBottom: "2px",
                      }}
                    >
                      Intelligence Report — Active
                    </div>
                    <div
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "9px",
                        color: "#2a3040",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {analysisTimestamp} · {result.processing_steps.length} pipeline stages completed
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Module summary chips */}
                  {[
                    { v: result.diagnoses.length,       label: "Dx",   c: "#10b981" },
                    { v: result.medications.length,     label: "Meds", c: "#0ea5e9" },
                    { v: result.interactions.length,    label: "IA",   c: criticalAlerts > 0 ? "#ef4444" : "#f59e0b" },
                    { v: result.similar_patients.length,label: "Pts",  c: "#38bdf8" },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        background: `${chip.c}0a`,
                        border: `1px solid ${chip.c}18`,
                        borderRadius: "4px",
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: chip.c,
                      }}
                    >
                      {chip.v} <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>{chip.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Critical alert banner */}
              {criticalAlerts > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    padding: "12px 18px",
                    marginBottom: "24px",
                    background: "rgba(239,68,68,0.05)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <AlertTriangle size={16} color="#ef4444" />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#ef4444",
                        marginBottom: "2px",
                      }}
                    >
                      ⚠ {criticalAlerts} Critical Drug Interaction{criticalAlerts > 1 ? "s" : ""} Detected
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Immediate clinical review recommended — see Interaction Alerts below for full details
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PHASE I — Clinical Assessment */}
              <PhaseLabel phase="Phase I" label="Clinical Assessment" color="#10b981" />
              <div
                id="demo-diagnoses"
                style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 2fr",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
                <div className="card" style={{ padding: "20px" }}>
                  <SectionHeader title="Differential Diagnoses" count={result.diagnoses.length} accentColor="#10b981" />
                  {result.diagnoses.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "#2a3040", textAlign: "center", padding: "20px",
                      fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace", letterSpacing: "0.08em" }}>
                      NO DIAGNOSES GENERATED
                    </div>
                  ) : (
                    result.diagnoses.map((dx, i) => (
                      <DiagnosisCard key={i} diagnosis={dx} rank={i} forceExpand={demoExpandDiag && i === 0} />
                    ))
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div id="demo-medications" className="card" style={{ padding: "20px" }}>
                    <SectionHeader title="Extracted Medications" count={result.medications.length} accentColor="#0ea5e9" />
                    <MedicationTable medications={result.medications} />
                  </div>
                  <div id="demo-interactions" className="card" style={{ padding: "20px" }}>
                    <SectionHeader
                      title="Interaction Alerts"
                      count={result.interactions.length}
                      accentColor={criticalAlerts > 0 ? "#ef4444" : "#f59e0b"}
                    />
                    <InteractionAlerts interactions={result.interactions} demoExpandIdx={demoExpandInteract} />
                  </div>
                </div>
              </div>

              {/* PHASE II — Patient Intelligence */}
              <div className="intel-sep" />
              <PhaseLabel phase="Phase II" label="Patient Intelligence" color="#0ea5e9" />
              <div
                id="demo-patients"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
                <div className="card" style={{ padding: "20px" }}>
                  <SectionHeader title="Similar Patients" count={result.similar_patients.length} accentColor="#38bdf8" />
                  <SimilarPatients patients={result.similar_patients} demoExpandFirst={demoExpandPatient} />
                </div>
                <div id="demo-icd10" className="card" style={{ padding: "20px" }}>
                  <SectionHeader title="ICD-10 Matches" count={result.icd10_matches.length} accentColor="#06b6d4" />
                  <ICD10Matches matches={result.icd10_matches} />
                </div>
              </div>

              {/* PHASE III — Risk & Cost Forecast */}
              {(result.admission_risk || result.cost_analysis) && (
                <>
                  <div className="intel-sep" />
                  <PhaseLabel phase="Phase III" label="Operational Forecast" color="#f59e0b" />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    {result.admission_risk && (
                      <div id="demo-risk" className="card" style={{ padding: "20px" }}>
                        <SectionHeader
                          title="Admission Risk Simulation"
                          accentColor={
                            result.admission_risk.risk_level === "critical" ? "#ef4444" :
                            result.admission_risk.risk_level === "high"     ? "#f97316" :
                            result.admission_risk.risk_level === "medium"   ? "#f59e0b" : "#10b981"
                          }
                        />
                        <AdmissionRisk data={result.admission_risk} />
                      </div>
                    )}
                    {result.cost_analysis && (
                      <div id="demo-cost" className="card" style={{ padding: "20px" }}>
                        <SectionHeader
                          title="Cost & Utilization Analysis"
                          accentColor={
                            result.cost_analysis.cost_tier === "critical" ? "#ef4444" :
                            result.cost_analysis.cost_tier === "high"     ? "#f97316" :
                            result.cost_analysis.cost_tier === "medium"   ? "#f59e0b" : "#10b981"
                          }
                        />
                        <CostAnalysis data={result.cost_analysis} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* PHASE IV — Evidence */}
              <div className="intel-sep" />
              <PhaseLabel phase="Phase IV" label="Evidence Chain" color="#818cf8" />
              <div id="demo-evidence" className="card" style={{ padding: "20px", marginBottom: "14px" }}>
                <SectionHeader title="Evidence Chain" accentColor="#818cf8" />
                <EvidenceChain result={result} />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 0 4px",
                  borderTop: "1px solid rgba(14,165,233,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="data-tag">PMC-Patients 167K</span>
                  <span className="data-tag">nomic-embed-text-v1.5</span>
                  <span className="data-tag">qwen2.5-3b-instruct</span>
                  <span className="data-tag">100% local</span>
                </div>
                <button
                  onClick={() => setShowMethodology(true)}
                  style={{
                    background: "rgba(14,165,233,0.04)",
                    border: "1px solid rgba(14,165,233,0.1)",
                    color: "#556070",
                    cursor: "pointer",
                    borderRadius: "5px",
                    padding: "5px 14px",
                    fontSize: "10px",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.3)";
                    (e.target as HTMLButtonElement).style.color = "#38bdf8";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.1)";
                    (e.target as HTMLButtonElement).style.color = "#556070";
                  }}
                >
                  Methodology
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state — after hero, no extra padding needed */}
        {!isLoading && !result && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ textAlign: "center", padding: "32px 20px 60px" }}
          >
            <div
              style={{
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#2a3040",
                marginBottom: "8px",
              }}
            >
              Awaiting Patient Data
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#1a2030",
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                letterSpacing: "0.08em",
              }}
            >
              BM25 + FAISS hybrid retrieval · ICD-10 semantic mapping · Pharmacovigilance · Risk simulation
            </div>
          </motion.div>
        )}
      </div>

      <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />
      <HowItWorks
        isOpen={showHowItWorks}
        onClose={() => { setShowHowItWorks(false); }}
        controlledTab={howItWorksTab}
        scrollToDesign={howItWorksScroll}
      />
      <DemoTour step={demoStepData} onStop={stopDemo} />
    </div>
  );
}

export default App;
