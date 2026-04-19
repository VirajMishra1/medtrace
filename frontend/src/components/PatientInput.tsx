import React, { useState } from "react";
import { PatientRecord } from "../types";
import { getPatient } from "../api";
import { ChevronDown, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";

const SAMPLE_CASES = [
  {
    label: "COVID-19 ARDS — Respiratory",
    note: `This 60-year-old male was hospitalized due to moderate ARDS from COVID-19 with symptoms of fever, dry cough, and dyspnea. He required 6 L/min of oxygen supplementation. Physical therapy was provided with careful monitoring of oxygen saturation. The patient was on dexamethasone 6mg daily IV and remdesivir 200mg loading dose then 100mg daily for 5 days. He also received enoxaparin 40mg subcutaneous daily for DVT prophylaxis and acetaminophen 500mg every 6 hours for fever management.`,
  },
  {
    label: "Polypharmacy — Cardiac + Anticoagulation",
    note: `A 72-year-old female with atrial fibrillation, type 2 diabetes mellitus, and hypertension presents with increasing fatigue and dyspnea on exertion. Current medications include warfarin 5mg daily (INR 2.4), metformin 1000mg twice daily, lisinopril 10mg daily, aspirin 81mg daily, atorvastatin 40mg at bedtime, and amiodarone 200mg daily. Recent labs show elevated creatinine (1.8 mg/dL) and HbA1c 8.2%. ECG shows controlled ventricular rate of 78 bpm. She reports occasional mild hypoglycemic episodes.`,
  },
  {
    label: "Acute Leukemia — Oncology",
    note: `A 45-year-old male presents with a 3-week history of progressive fatigue, pallor, easy bruising, and recurrent fevers. Complete blood count reveals WBC 85,000/μL with 80% blasts, hemoglobin 7.2 g/dL, and platelets 28,000/μL. Bone marrow biopsy confirms acute myeloid leukemia (AML) with FLT3-ITD mutation. He was started on induction chemotherapy with cytarabine 100mg/m2 continuous infusion for 7 days and daunorubicin 60mg/m2 IV on days 1-3. Allopurinol 300mg daily was initiated for tumor lysis prophylaxis. Blood cultures grew E. coli and cefepime 2g every 8 hours was added.`,
  },
  {
    label: "Pediatric — Kawasaki Disease",
    note: `A 4-year-old male presents with 6 days of high fever (39.8°C), bilateral conjunctival injection without discharge, cracked erythematous lips, strawberry tongue, erythema of palms and soles, and a polymorphous rash on the trunk. Laboratory findings show elevated ESR (85 mm/hr), CRP (12 mg/dL), WBC 18,000/μL with neutrophilia, and platelet count rising to 680,000/μL. Echocardiogram reveals mildly dilated left anterior descending coronary artery (z-score +2.8). Diagnosis of Kawasaki disease was made. Treatment initiated with IVIG 2g/kg single infusion and aspirin 80mg/kg/day in 4 divided doses.`,
  },
  {
    label: "Multi-comorbidity — Sepsis + CKD",
    note: `A 68-year-old male with chronic kidney disease stage 3b (eGFR 32 mL/min), type 2 diabetes, and peripheral vascular disease presents with acute sepsis secondary to a non-healing diabetic foot ulcer with cellulitis extending to the ankle. Vital signs: temperature 38.9°C, HR 112 bpm, BP 88/54 mmHg, RR 22/min, SpO2 94% on room air. Lactate 3.8 mmol/L. He is on insulin glargine 20 units at bedtime and insulin lispro sliding scale, amlodipine 10mg daily, furosemide 40mg daily, and erythropoiesis-stimulating agent epoetin alfa. IV piperacillin-tazobactam 3.375g every 8 hours (renally dosed) and vancomycin (with trough monitoring) were initiated.`,
  },
  {
    label: "Rare Disease — Wilson's Disease",
    note: `A 19-year-old female presents with a 2-month history of progressive tremor, dysarthria, and behavioral changes including mood lability and academic decline. Neurological examination reveals mild dysmetria, resting tremor of the hands, and slurred speech. Ophthalmologic exam with slit-lamp reveals Kayser-Fleischer rings bilaterally. Laboratory work-up: serum ceruloplasmin 8 mg/dL (low), 24-hour urine copper 320 μg/day (elevated), liver enzymes mildly elevated (ALT 68, AST 72). MRI brain shows T2 hyperintensity in the bilateral basal ganglia and thalami. Wilson's disease confirmed. Treatment initiated with D-penicillamine 250mg four times daily gradually increasing to 1g/day, with pyridoxine 25mg daily supplementation.`,
  },
];

interface PatientInputProps {
  onAnalyze: (note: string) => void;
  isLoading: boolean;
  samplePatients: PatientRecord[];
  demoNote?: string;
}

const PatientInput: React.FC<PatientInputProps> = ({ onAnalyze, isLoading, samplePatients, demoNote }) => {
  const [note, setNote] = useState("");
  const [selectedSample, setSelectedSample] = useState("");
  React.useEffect(() => { if (demoNote !== undefined) setNote(demoNote); }, [demoNote]);
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const charCount = note.length;

  const handleSampleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSample(val);
    if (val.startsWith("builtin:")) {
      const idx = parseInt(val.replace("builtin:", ""), 10);
      setNote(SAMPLE_CASES[idx].note);
    } else if (val.startsWith("db:")) {
      const uid = val.replace("db:", "");
      try {
        const record = await getPatient(uid);
        setNote(record.full_note || record.snippet);
      } catch {
        const patient = samplePatients.find((p) => p.patient_uid === uid);
        if (patient) setNote(patient.snippet);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="card"
      style={{ padding: "26px", marginBottom: "24px" }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "18px",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: "6px",
            }}
          >
            Patient Clinical Note
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              letterSpacing: "0.005em",
              lineHeight: 1.5,
              maxWidth: "520px",
            }}
          >
            Paste unstructured clinical text. The pipeline extracts diagnoses, medications, interaction risks, and a cost profile.
          </div>
        </div>

        {/* Sample selector */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={selectedSample}
            onChange={handleSampleSelect}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: "rgba(14,165,233,0.04)",
              border: "1px solid rgba(14,165,233,0.12)",
              color: "#556070",
              padding: "7px 34px 7px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              cursor: "pointer",
              minWidth: "200px",
              transition: "border-color 0.15s ease",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.03em",
            }}
          >
            <option value="">Load demo case...</option>
            <optgroup label="CURATED DEMO CASES">
              {SAMPLE_CASES.map((c, i) => (
                <option key={i} value={`builtin:${i}`}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            {samplePatients.length > 0 && (
              <optgroup label="PMC-PATIENTS DATABASE">
                {samplePatients.map((p) => (
                  <option key={p.patient_uid} value={`db:${p.patient_uid}`}>
                    {p.patient_uid} — {p.age ?? "?"} / {p.gender ?? "?"}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown
            size={11}
            color="#556070"
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          "Paste a clinical note here…\n\nExample: 65-year-old male with hypertension and type 2 diabetes presenting with…"
        }
        style={{
          width: "100%",
          minHeight: "200px",
          background: "var(--bg-sunken)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          color: "var(--text-primary)",
          fontSize: "13.5px",
          lineHeight: "1.75",
          padding: "18px",
          resize: "vertical",
          fontFamily: "inherit",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      />

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "14px",
        }}
      >
        {/* Metadata */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {wordCount > 0 ? (
            <>
              <span className="data-tag">{wordCount} words</span>
              <span className="data-tag">{charCount} chars</span>
            </>
          ) : (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              MIN 10 CHARS REQUIRED
            </span>
          )}
        </div>

        {/* Analyze button */}
        <button
          className="btn-primary"
          onClick={() => onAnalyze(note)}
          disabled={isLoading || note.trim().length < 10}
        >
          {isLoading ? (
            <>
              <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
              Running Pipeline...
            </>
          ) : (
            <>
              <Play size={12} fill="white" />
              Run Analysis
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default PatientInput;
