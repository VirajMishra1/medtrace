import React from "react";
import { AnalysisResponse } from "../types";

interface EvidenceChainProps {
  result: AnalysisResponse;
}

const Node: React.FC<{
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  border: string;
}> = ({ label, sublabel, color, bg, border }) => (
  <div
    style={{
      padding: "10px 14px",
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: "6px",
      textAlign: "center",
      minWidth: "100px",
    }}
  >
    <div style={{ fontSize: "12px", fontWeight: 600, color }}>{label}</div>
    {sublabel && (
      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
        {sublabel}
      </div>
    )}
  </div>
);

const Arrow: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#3a4060",
    }}
  >
    {vertical ? (
      <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
        <path
          d="M8 2V18M4 14L8 18L12 14"
          stroke="#3a4060"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ) : (
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path
          d="M2 8H18M14 4L18 8L14 12"
          stroke="#3a4060"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )}
  </div>
);

const EvidenceChain: React.FC<EvidenceChainProps> = ({ result }) => {
  const topDx = result.diagnoses[0] ?? null;
  const criticalCount = result.interactions.filter((i) => i.severity === "critical").length;

  if (!topDx) return null;

  return (
    <div
      style={{
        padding: "16px",
        background: "var(--bg-sunken)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          minWidth: "fit-content",
        }}
      >
        {/* Input note */}
        <Node
          label="Patient Note"
          sublabel={`${result.query_snippet.split(" ").length} words`}
          color="#e2e8f0"
          bg="var(--bg-elevated)"
          border="#3a4060"
        />

        <Arrow />

        {/* Embedding */}
        <Node
          label="nomic-embed"
          sublabel="768-dim"
          color="#0ea5e9"
          bg="rgba(99, 102, 241, 0.08)"
          border="rgba(99, 102, 241, 0.2)"
        />

        <Arrow />

        {/* Parallel branches */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <Arrow />
            <Node
              label="Similar Patients"
              sublabel={`${result.similar_patients.length} via BM25+FAISS`}
              color="#38bdf8"
              bg="rgba(99, 102, 241, 0.06)"
              border="rgba(99, 102, 241, 0.15)"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <Arrow />
            <Node
              label="ICD-10 Codes"
              sublabel={`${result.icd10_matches.length} matched`}
              color="#22d3ee"
              bg="rgba(139, 92, 246, 0.06)"
              border="rgba(139, 92, 246, 0.15)"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <Arrow />
            <Node
              label="Medications"
              sublabel={`${result.medications.length} extracted`}
              color="#94a3b8"
              bg="var(--bg-elevated)"
              border="#3a4060"
            />
          </div>
        </div>

        <Arrow />

        {/* Fusion */}
        <Node
          label="RRF Fusion"
          sublabel="k=60"
          color="#0ea5e9"
          bg="rgba(99, 102, 241, 0.08)"
          border="rgba(99, 102, 241, 0.2)"
        />

        <Arrow />

        {/* LLM */}
        <Node
          label="qwen2.5-3b"
          sublabel="Chain-of-thought"
          color="#f59e0b"
          bg="rgba(245, 158, 11, 0.06)"
          border="rgba(245, 158, 11, 0.15)"
        />

        <Arrow />

        {/* Outputs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {topDx && (
            <Node
              label={topDx.name.slice(0, 24) + (topDx.name.length > 24 ? "…" : "")}
              sublabel={`${Math.round(topDx.confidence_pct * 100)}% confidence`}
              color="#10b981"
              bg="rgba(16, 185, 129, 0.06)"
              border="rgba(16, 185, 129, 0.15)"
            />
          )}
          {criticalCount > 0 && (
            <Node
              label={`${criticalCount} Critical Alert`}
              sublabel="Drug interaction"
              color="#ef4444"
              bg="rgba(239, 68, 68, 0.06)"
              border="rgba(239, 68, 68, 0.15)"
            />
          )}
          {result.diagnoses.length > 1 && (
            <Node
              label={`+${result.diagnoses.length - 1} more Dx`}
              sublabel="differential"
              color="#64748b"
              bg="var(--bg-sunken)"
              border="var(--border-subtle)"
            />
          )}
        </div>
      </div>

      {/* Processing steps audit trail */}
      <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
        <div className="section-label" style={{ marginBottom: "8px" }}>
          Audit Trail
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        >
          {result.processing_steps.map((step, i) => (
            <div
              key={i}
              style={{
                color: i === result.processing_steps.length - 1 ? "#0ea5e9" : "#475569",
              }}
            >
              <span style={{ color: "#3a4060", marginRight: "6px" }}>
                [{String(i + 1).padStart(2, "0")}]
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvidenceChain;
