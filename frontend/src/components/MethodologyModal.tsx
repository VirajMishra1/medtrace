import React from "react";

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "#12121a",
          border: "1px solid #2a2a3e",
          borderRadius: "10px",
          padding: "28px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "4px",
              }}
            >
              Methodology & Architecture
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              MedTrace — PMC-Patients × ICD-10 × Local LLM
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #2a2a3e",
              color: "#64748b",
              cursor: "pointer",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "13px",
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Research paper */}
          <Section title="Research Foundation">
            <p>
              This system implements the retrieval methodology from{" "}
              <strong style={{ color: "#818cf8" }}>
                "PMC-Patients: A Large-scale Dataset of Patient Summaries and Relations for
                Benchmarking Retrieval-based Clinical Decision Support Systems"
              </strong>{" "}
              (Zhao et al., 2023).
            </p>
            <p style={{ marginTop: "8px" }}>
              The paper benchmarks multiple retrieval approaches on 167K patient summaries from
              PubMed Central. Key finding: BM25 achieves 48% MRR on PAR tasks, while fine-tuned
              dense retrievers achieve 63% Recall@1k — motivating a hybrid approach.
            </p>
          </Section>

          {/* Hybrid retrieval */}
          <Section title="Hybrid BM25 + Dense Retrieval">
            <p>
              MedTrace implements <strong style={{ color: "#6366f1" }}>Reciprocal Rank Fusion (RRF)</strong>:
            </p>
            <div
              style={{
                margin: "10px 0",
                padding: "10px 14px",
                background: "#0a0a0f",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#a78bfa",
                border: "1px solid #1e1e2e",
              }}
            >
              score = Σ 1/(k + rank_i), where k=60
            </div>
            <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
              <li>
                <strong style={{ color: "#94a3b8" }}>BM25 (sparse)</strong> — exact medical term
                matching via <code style={{ color: "#a78bfa" }}>rank_bm25.BM25Okapi</code>
              </li>
              <li>
                <strong style={{ color: "#94a3b8" }}>Dense FAISS</strong> — semantic similarity
                via <code style={{ color: "#a78bfa" }}>nomic-embed-text-v1.5</code> (768-dim)
              </li>
              <li>
                Top-50 candidates from each are fused into a single ranked list
              </li>
            </ul>
          </Section>

          {/* Evidence chains */}
          <Section title="Evidence Chain Architecture">
            <p>Every output is fully traceable:</p>
            <ul style={{ paddingLeft: "20px", lineHeight: "1.8", marginTop: "8px" }}>
              <li>Patient note → embedding → similar patients (with patient_uid links)</li>
              <li>Patient note → ICD-10 semantic search → matched codes (with confidence)</li>
              <li>Medications → drug interaction check → severity-ranked alerts</li>
              <li>All evidence feeds the LLM → diagnosis with cited sources</li>
            </ul>
          </Section>

          {/* Privacy */}
          <Section title="Privacy-First Architecture">
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                borderRadius: "6px",
              }}
            >
              <p style={{ color: "#10b981", fontWeight: 600, marginBottom: "4px" }}>
                100% Local Inference
              </p>
              <p style={{ fontSize: "12px", color: "#64748b" }}>
                All LLM inference and embedding generation runs locally via LM Studio on your
                machine. No patient data leaves your environment. Models used: qwen2.5-3b-instruct
                (LLM) and nomic-embed-text-v1.5 (embeddings).
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: "#6366f1",
        textTransform: "uppercase",
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          height: "1px",
          flex: 1,
          background:
            "linear-gradient(90deg, rgba(99,102,241,0.4), transparent)",
        }}
      />
      {title}
    </div>
    <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.7" }}>{children}</div>
  </div>
);

export default MethodologyModal;
