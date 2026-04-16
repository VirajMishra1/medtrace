import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Square } from "lucide-react";

export interface DemoStep {
  stepNum: number;
  totalSteps: number;
  label: string;
  phase: string;
  voiceover: string;
  progress: number;
}

interface DemoTourProps {
  step: DemoStep | null;
  onStop: () => void;
}

const DemoTour: React.FC<DemoTourProps> = ({ step, onStop }) => {
  return (
    <AnimatePresence>
      {step && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            zIndex: 300,
            background: "rgba(7,7,13,0.92)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "6px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
            overflow: "hidden",
            width: "200px",
          }}
        >
          {/* Content row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
            }}
          >
            {/* Dot */}
            <div
              className="pulse-dot"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ef4444",
                color: "#ef4444",
                flexShrink: 0,
              }}
            />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#ef4444",
                  textTransform: "uppercase",
                  lineHeight: 1.3,
                }}
              >
                Demo Recording
              </div>
              <div
                style={{
                  fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                  fontSize: "8px",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: "#0ea5e9",
                  textTransform: "uppercase",
                  lineHeight: 1.3,
                  marginTop: "1px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {step.phase} · {step.stepNum}/{step.totalSteps}
              </div>
            </div>

            {/* Stop */}
            <button
              onClick={onStop}
              title="Stop demo"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "3px",
                padding: "4px",
                cursor: "pointer",
                color: "#475569",
                transition: "color 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
            >
              <Square size={8} />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: "2px", background: "rgba(255,255,255,0.04)" }}>
            <motion.div
              animate={{ width: `${step.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #0284c7, #0ea5e9, #06b6d4)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoTour;
