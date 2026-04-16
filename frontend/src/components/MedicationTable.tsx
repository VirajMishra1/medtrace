import React from "react";
import { Medication } from "../types";
import { Pill } from "lucide-react";
import { motion } from "framer-motion";

interface MedicationTableProps {
  medications: Medication[];
}

const Dash = () => (
  <span style={{ color: "#252540", fontSize: "12px" }}>—</span>
);

const MedicationTable: React.FC<MedicationTableProps> = ({ medications }) => {
  if (medications.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          textAlign: "center",
          color: "#383858",
          fontSize: "12px",
          background: "rgba(5,5,12,0.5)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Pill size={14} color="#383858" />
        No medications detected in this note
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          padding: "8px 14px",
          background: "rgba(5,5,12,0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          gap: "8px",
        }}
      >
        {["Drug", "Dosage", "Frequency", "Route"].map((h) => (
          <div
            key={h}
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#383858",
              textTransform: "uppercase",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {medications.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            padding: "9px 14px",
            borderBottom:
              i < medications.length - 1
                ? "1px solid rgba(255,255,255,0.04)"
                : "none",
            gap: "8px",
            background:
              i % 2 === 0 ? "rgba(5,5,12,0.3)" : "rgba(5,5,12,0.15)",
            transition: "background 0.15s ease",
          }}
          whileHover={{
            background: "rgba(14,165,233,0.04)",
          }}
        >
          {/* Drug name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#e2e8f0",
              letterSpacing: "-0.01em",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "5px",
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Pill size={10} color="#38bdf8" />
            </div>
            {m.drug_name}
          </div>

          <div
            className="mono-chip"
            style={{ color: m.dosage ? "#94a3b8" : "#252540" }}
          >
            {m.dosage || <Dash />}
          </div>

          <div style={{ fontSize: "12px", color: m.frequency ? "#94a3b8" : "#252540" }}>
            {m.frequency || <Dash />}
          </div>

          <div style={{ fontSize: "12px", color: m.route ? "#94a3b8" : "#252540" }}>
            {m.route || <Dash />}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MedicationTable;
