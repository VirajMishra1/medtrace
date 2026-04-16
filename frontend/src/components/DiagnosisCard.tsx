import React, { useState } from "react";
import { Diagnosis } from "../types";
import { ChevronDown, AlertCircle, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  rank: number;
  forceExpand?: boolean;
}

const CONF_MAP = {
  high:   { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)"  },
  low:    { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"   },
};

const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis, rank, forceExpand }) => {
  const [expanded, setExpanded] = useState(rank === 0);
  React.useEffect(() => { if (forceExpand) setExpanded(true); }, [forceExpand]);
  const conf = CONF_MAP[diagnosis.confidence_label as keyof typeof CONF_MAP] ?? CONF_MAP.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.07, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{
        marginBottom: "8px",
        background: "var(--bg-card)",
        border: `1px solid ${expanded ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.045)"}`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "border-color 0.25s ease",
      }}
    >
      {/* Accent bar on left for top diagnosis */}
      {rank === 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            background: "linear-gradient(180deg, #0ea5e9, #06b6d4)",
            borderRadius: "12px 0 0 12px",
          }}
        />
      )}

      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          userSelect: "none",
        }}
      >
        {/* Rank badge */}
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            background:
              rank === 0
                ? "linear-gradient(135deg, #0284c7, #0ea5e9)"
                : "rgba(255,255,255,0.04)",
            border: rank === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            color: rank === 0 ? "white" : "#64748b",
            flexShrink: 0,
            boxShadow: rank === 0 ? "0 0 12px rgba(14,165,233,0.3)" : "none",
          }}
        >
          {rank + 1}
        </div>

        {/* Name + ICD code */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#f0f4ff",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {diagnosis.name}
          </div>
          {diagnosis.icd10_code && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "3px",
                fontSize: "10px",
                color: "#22d3ee",
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                padding: "1px 6px",
                borderRadius: "5px",
              }}
            >
              {diagnosis.icd10_code}
            </div>
          )}
        </div>

        {/* Confidence */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: conf.color,
                lineHeight: 1,
              }}
            >
              {Math.round(diagnosis.confidence_pct * 100)}%
            </div>
            <div
              className={`badge badge-${diagnosis.confidence_label}`}
              style={{ marginTop: "3px" }}
            >
              {diagnosis.confidence_label}
            </div>
          </div>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={15} color="#64748b" />
          </motion.div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ padding: "0 16px 12px 54px" }}>
        <div className="confidence-bar-track">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${diagnosis.confidence_pct * 100}%` }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: rank * 0.07 + 0.2 }}
            className="confidence-bar-fill"
            style={{
              background: `linear-gradient(90deg, ${conf.color}66, ${conf.color})`,
            }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Clinical reasoning */}
              {diagnosis.clinical_reasoning && (
                <div>
                  <div className="section-label" style={{ marginBottom: "6px" }}>
                    Clinical Reasoning
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      lineHeight: "1.7",
                    }}
                  >
                    {diagnosis.clinical_reasoning}
                  </p>
                </div>
              )}

              {/* Key concerns */}
              {diagnosis.key_concerns.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <AlertCircle size={11} color="#f59e0b" />
                    <span className="section-label">Key Concerns</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {diagnosis.key_concerns.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          padding: "3px 9px",
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          color: "#f59e0b",
                          borderRadius: "6px",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Medication flags */}
              {diagnosis.medication_flags.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <Pill size={11} color="#ef4444" />
                    <span className="section-label">Medication Flags</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {diagnosis.medication_flags.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          padding: "3px 9px",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          color: "#ef4444",
                          borderRadius: "6px",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              <div
                style={{
                  background: "rgba(5,5,12,0.6)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div className="section-label" style={{ marginBottom: "10px" }}>
                  Supporting Evidence
                </div>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {diagnosis.evidence.patient_uids.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#383858",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 600,
                        }}
                      >
                        Patients
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {diagnosis.evidence.patient_uids.slice(0, 5).map((uid) => (
                          <span
                            key={uid}
                            className="mono-chip"
                            style={{
                              padding: "2px 6px",
                              background: "rgba(14,165,233,0.08)",
                              border: "1px solid rgba(14,165,233,0.18)",
                              color: "#38bdf8",
                              borderRadius: "4px",
                            }}
                          >
                            {uid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnosis.evidence.icd10_codes.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#383858",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 600,
                        }}
                      >
                        ICD-10
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {diagnosis.evidence.icd10_codes.slice(0, 5).map((code) => (
                          <span
                            key={code}
                            className="mono-chip"
                            style={{
                              padding: "2px 6px",
                              background: "rgba(6,182,212,0.08)",
                              border: "1px solid rgba(6,182,212,0.18)",
                              color: "#22d3ee",
                              borderRadius: "4px",
                            }}
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiagnosisCard;
