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
  Tag, AlertTriangle,
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
type Tone = "neutral" | "danger" | "warning" | "success";
const TONE_COLORS: Record<Tone, string> = {
  neutral: "var(--text-secondary)",
  danger:  "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
};

const SectionHeader: React.FC<{ title: string; count?: number; tone?: Tone }> = ({
  title, count, tone = "neutral",
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: "20px",
      paddingBottom: "12px",
      borderBottom: "1px solid var(--border-subtle)",
    }}
  >
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        fontWeight: 600,
        color: TONE_COLORS[tone],
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {title}
    </span>
    {count !== undefined && (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: 500,
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        {String(count).padStart(2, "0")}
      </span>
    )}
  </div>
);

/* ── Hero section ───────────────────────────────────────────────────────────── */
const HeroSection: React.FC<{ health: HealthStatus | null }> = ({ health }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, ease: [0.25, 0, 0, 1] }}
    style={{ padding: "72px 0 56px", textAlign: "center", position: "relative" }}
  >
    {/* Kicker */}
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "28px",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      <div
        className="pulse-dot"
        style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", color: "var(--accent)" }}
      />
      Palantir Build Challenge · Healthcare AI
    </div>

    {/* Display headline — Instrument Serif */}
    <h1 style={{ marginBottom: "0" }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(42px, 6.5vw, 68px)",
          fontWeight: 400,
          letterSpacing: "-0.025em",
          lineHeight: 1.08,
          color: "var(--text-primary)",
        }}
      >
        Clinical Intelligence
      </span>
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(42px, 6.5vw, 68px)",
          fontWeight: 400,
          fontStyle: "italic",
          letterSpacing: "-0.025em",
          lineHeight: 1.12,
          color: "var(--text-secondary)",
        }}
      >
        at the Point of Care.
      </span>
    </h1>

    {/* Lede */}
    <p
      style={{
        fontSize: "15px",
        color: "var(--text-secondary)",
        maxWidth: "500px",
        margin: "24px auto 40px",
        lineHeight: 1.65,
      }}
    >
      Differential diagnoses, drug interaction detection, admission risk simulation,
      and cost modelling — from a clinical note, in seconds, entirely local.
    </p>

    {/* Stats bar — unified card */}
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--r-sm)",
        overflow: "hidden",
      }}
    >
      {[
        { icon: <Database size={11} />, value: (health?.patient_count ?? 167442).toLocaleString(), label: "patients" },
        { icon: <Tag size={11} />,      value: (health?.icd10_count  ?? 96000).toLocaleString() + "+", label: "ICD-10 codes" },
        { icon: <Activity size={11} />, value: "4",     label: "AI modules" },
        { icon: <Shield size={11} />,   value: "100%",  label: "local" },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 20px",
            borderRight: i < 3 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <span style={{ color: "var(--accent)", opacity: 0.65 }}>{s.icon}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {s.value}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>

    <div className="intel-sep" style={{ marginTop: "52px", marginBottom: "0" }} />
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
    getSamplePatients(12)
      .then(setSamplePatients)
      .catch(() => {
        setSamplePatients([]);
        console.warn("[MedTrace] Failed to load sample patients — backend may be offline");
      });
  }, []);

  const handleAnalyze = useCallback(async (note: string) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setLiveSteps([]);
    setCurrentStep("Embedding patient note");
    setAnalysisTimestamp(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");

    const PIPELINE_LABELS = [
      "Embedding patient note",
      "Retrieving similar patients",
      "Mapping ICD-10 codes",
      "Extracting medications",
      "Checking interactions",
      "Generating diagnoses",
    ];
    let stepIdx = 0;
    // Stagger steps across the expected ~30s analysis window (5s each)
    const stepInterval = setInterval(() => {
      if (stepIdx < PIPELINE_LABELS.length) {
        setCurrentStep(PIPELINE_LABELS[stepIdx]);
        setLiveSteps((prev) => [...prev, PIPELINE_LABELS[stepIdx]]);
        stepIdx++;
      }
    }, 5000);

    try {
      const data = await analyzePatient(note);
      clearInterval(stepInterval);
      setLiveSteps(data.processing_steps);
      setCurrentStep("Analysis complete");
      setResult(data);
    } catch (e: unknown) {
      clearInterval(stepInterval);
      const axiosErr = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(
        axiosErr?.response?.data?.detail ||
        axiosErr?.message ||
        "Analysis failed. Check that the backend is running."
      );
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
                fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
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
              {/* Thin status line — replaces loud Intelligence Report banner */}
              <motion.div
                id="demo-report"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "4px 2px 24px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)" }} />
                  Analysis complete
                  <span style={{ color: "var(--text-ghost)" }}>·</span>
                  <span style={{ color: "var(--text-muted)" }}>{analysisTimestamp}</span>
                </span>
                <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "14px" }}>
                  <span><span style={{ color: "var(--text-secondary)" }}>{result.diagnoses.length}</span> Dx</span>
                  <span><span style={{ color: "var(--text-secondary)" }}>{result.medications.length}</span> Meds</span>
                  <span>
                    <span style={{ color: criticalAlerts > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                      {result.interactions.length}
                    </span> Interactions
                  </span>
                  <span><span style={{ color: "var(--text-secondary)" }}>{result.similar_patients.length}</span> Patients</span>
                </span>
              </motion.div>

              {/* Critical alert — editorial, no emoji */}
              {criticalAlerts > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    padding: "14px 18px",
                    marginBottom: "28px",
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    borderLeft: "2px solid #ef4444",
                    borderRadius: "var(--r-sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <AlertTriangle size={16} color="#ef4444" strokeWidth={1.8} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#ef4444",
                        marginBottom: "3px",
                      }}
                    >
                      {criticalAlerts} Critical Drug Interaction{criticalAlerts > 1 ? "s" : ""} Detected
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                      Immediate clinical review recommended — see Interaction Alerts below for full details.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Clinical Assessment — Diagnoses + Meds + Interactions */}
              <div
                id="demo-diagnoses"
                style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 2fr",
                  gap: "16px",
                  marginBottom: "32px",
                }}
              >
                <div className="card" style={{ padding: "22px" }}>
                  <SectionHeader title="Differential Diagnoses" count={result.diagnoses.length} />
                  {result.diagnoses.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "20px",
                      fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                      NO DIAGNOSES GENERATED
                    </div>
                  ) : (
                    result.diagnoses.map((dx, i) => (
                      <DiagnosisCard key={i} diagnosis={dx} rank={i} forceExpand={demoExpandDiag && i === 0} />
                    ))
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div id="demo-medications" className="card" style={{ padding: "22px" }}>
                    <SectionHeader title="Extracted Medications" count={result.medications.length} />
                    <MedicationTable medications={result.medications} />
                  </div>
                  <div id="demo-interactions" className="card" style={{ padding: "22px" }}>
                    <SectionHeader
                      title="Interaction Alerts"
                      count={result.interactions.length}
                      tone={criticalAlerts > 0 ? "danger" : result.interactions.length > 0 ? "warning" : "neutral"}
                    />
                    <InteractionAlerts interactions={result.interactions} demoExpandIdx={demoExpandInteract} />
                  </div>
                </div>
              </div>

              {/* Patient Intelligence — Similar Patients + ICD-10 */}
              <div
                id="demo-patients"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "32px",
                }}
              >
                <div className="card" style={{ padding: "22px" }}>
                  <SectionHeader title="Similar Patients" count={result.similar_patients.length} />
                  <SimilarPatients patients={result.similar_patients} demoExpandFirst={demoExpandPatient} />
                </div>
                <div id="demo-icd10" className="card" style={{ padding: "22px" }}>
                  <SectionHeader title="ICD-10 Matches" count={result.icd10_matches.length} />
                  <ICD10Matches matches={result.icd10_matches} />
                </div>
              </div>

              {/* Operational Forecast — Admission Risk + Cost */}
              {(result.admission_risk || result.cost_analysis) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginBottom: "32px",
                  }}
                >
                  {result.admission_risk && (
                    <div id="demo-risk" className="card" style={{ padding: "22px" }}>
                      <SectionHeader
                        title="Admission Risk Simulation"
                        tone={
                          result.admission_risk.risk_level === "critical" || result.admission_risk.risk_level === "high"
                            ? "danger"
                            : result.admission_risk.risk_level === "medium"
                              ? "warning"
                              : "neutral"
                        }
                      />
                      <AdmissionRisk data={result.admission_risk} />
                    </div>
                  )}
                  {result.cost_analysis && (
                    <div id="demo-cost" className="card" style={{ padding: "22px" }}>
                      <SectionHeader
                        title="Cost & Utilization Analysis"
                        tone={
                          result.cost_analysis.cost_tier === "critical" || result.cost_analysis.cost_tier === "high"
                            ? "danger"
                            : result.cost_analysis.cost_tier === "medium"
                              ? "warning"
                              : "neutral"
                        }
                      />
                      <CostAnalysis data={result.cost_analysis} />
                    </div>
                  )}
                </div>
              )}

              {/* Evidence Chain */}
              <div id="demo-evidence" className="card" style={{ padding: "22px", marginBottom: "24px" }}>
                <SectionHeader title="Evidence Chain" />
                <EvidenceChain result={result} />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 2px 4px",
                  borderTop: "1px solid var(--border-subtle)",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span className="data-tag">PMC-Patients 167K</span>
                  <span className="data-tag">nomic-embed-text-v1.5</span>
                  <span className="data-tag">qwen2.5-3b-instruct</span>
                  <span className="data-tag">100% local</span>
                </div>
                <button
                  onClick={() => setShowMethodology(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    borderRadius: "var(--r-sm)",
                    padding: "7px 14px",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    transition: "color 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  }}
                >
                  Methodology ↗
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
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              Awaiting Patient Data
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-ghost)",
                fontFamily: "var(--font-mono)",
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
