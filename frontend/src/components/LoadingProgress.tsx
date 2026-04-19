import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS = [
  { label: "Embed",     sub: "nomic-text"  },
  { label: "Retrieve",  sub: "bm25+faiss"  },
  { label: "ICD-10",    sub: "96K codes"   },
  { label: "Meds",      sub: "NLP extract" },
  { label: "Interact",  sub: "pharma"      },
  { label: "Diagnose",  sub: "qwen2.5"     },
];

interface LoadingProgressProps {
  steps: string[];
  currentStep: string;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ steps, currentStep }) => {
  const progress    = Math.min(100, Math.round((steps.length / PIPELINE_STEPS.length) * 100));
  const isComplete  = steps.length >= PIPELINE_STEPS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
      style={{ padding: "20px", marginBottom: "20px" }}
    >
      {/* Phase label */}
      <div className="phase-label" style={{ marginBottom: "16px" }}>
        PIPELINE — RUNNING ANALYSIS
      </div>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <div style={{ flexShrink: 0 }}>
          {isComplete
            ? <CheckCircle2 size={18} color="#10b981" />
            : <Loader2 size={18} color="#0ea5e9" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#e8eef7",
              letterSpacing: "-0.01em",
              marginBottom: "2px",
            }}
          >
            {isComplete ? "Intelligence Report Ready" : "Running Analysis Pipeline"}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#556070",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {isComplete ? "All pipeline stages completed successfully" : (currentStep || "Initializing...")}
          </div>
        </div>

        {/* Progress % */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "22px",
            fontWeight: 700,
            color: isComplete ? "#10b981" : "#0ea5e9",
            letterSpacing: "-0.02em",
          }}
        >
          {progress}%
        </div>
      </div>

      {/* Thin progress bar */}
      <div
        style={{
          height: "2px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "99px",
          marginBottom: "20px",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: "99px",
            background: isComplete
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "linear-gradient(90deg, #0284c7, #0ea5e9, #06b6d4)",
          }}
        />
      </div>

      {/* Step grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {PIPELINE_STEPS.map((step, i) => {
          const done   = i < steps.length;
          const active = i === steps.length;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                padding: "8px",
                background: done
                  ? "rgba(16,185,129,0.06)"
                  : active
                  ? "rgba(14,165,233,0.06)"
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  done
                    ? "rgba(16,185,129,0.15)"
                    : active
                    ? "rgba(14,165,233,0.15)"
                    : "rgba(255,255,255,0.05)"
                }`,
                borderRadius: "7px",
                textAlign: "center",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "4px",
                }}
              >
                {done ? (
                  <CheckCircle2 size={14} color="#10b981" />
                ) : active ? (
                  <Loader2 size={14} color="#0ea5e9" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }} />
                )}
              </div>

              {/* Step number badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  margin: "0 auto 3px",
                  background: done
                    ? "rgba(52,211,153,0.1)"
                    : active
                    ? "rgba(14,165,233,0.1)"
                    : "rgba(255,255,255,0.04)",
                  borderRadius: "3px",
                  border: `1px solid ${
                    done
                      ? "rgba(52,211,153,0.2)"
                      : active
                      ? "rgba(14,165,233,0.2)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                }}
              >
                <span style={{ fontSize: "8px", color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</span>
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  color: done ? "#34d399" : active ? "#38bdf8" : "var(--text-muted)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {step.label}
              </div>

              {/* Sub */}
              <div
                style={{
                  fontSize: "9px",
                  color: done ? "rgba(52,211,153,0.4)" : "var(--text-ghost)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {step.sub}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Audit log */}
      <AnimatePresence>
        {steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: "16px" }}
          >
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(7,7,13,0.8)",
                borderRadius: "6px",
                border: "1px solid rgba(14,165,233,0.06)",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-muted)",
                maxHeight: "60px",
                overflowY: "auto",
                lineHeight: "1.8",
              }}
            >
              {steps.slice(-4).map((s, i) => (
                <div
                  key={i}
                  style={{ color: i === Math.min(steps.length, 4) - 1 ? "#38bdf8" : "var(--text-muted)" }}
                >
                  <span style={{ color: "var(--text-ghost)", marginRight: "10px" }}>
                    {String(steps.length - Math.min(steps.length, 4) + i + 1).padStart(2, "0")} ›
                  </span>
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LoadingProgress;
