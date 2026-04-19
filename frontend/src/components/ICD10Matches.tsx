import React from "react";
import { ICD10Match } from "../types";
import { Tag } from "lucide-react";
import { motion } from "framer-motion";

interface ICD10MatchesProps {
  matches: ICD10Match[];
}

const ICD10Matches: React.FC<ICD10MatchesProps> = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div
        style={{
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          background: "rgba(5,5,12,0.5)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "9px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            background: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Tag size={16} color="#22d3ee" strokeOpacity={0.5} />
        </div>
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "4px",
            }}
          >
            No ICD-10 codes matched
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            Note may be too short or use non-standard terminology
          </div>
        </div>
      </div>
    );
  }

  const maxConf = Math.max(...matches.map((m) => m.confidence));

  const confColor = (conf: number) => {
    const pct = conf / maxConf;
    if (pct > 0.8) return "#10b981";
    if (pct > 0.5) return "#f59e0b";
    return "#64748b";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {matches.map((m, i) => {
        const color = confColor(m.confidence);
        return (
          <motion.div
            key={`${m.code}-${i}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025, duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              background: "rgba(5,5,12,0.5)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: "8px",
              transition: "border-color 0.15s ease, background 0.15s ease",
              cursor: "default",
            }}
            whileHover={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "rgba(99,102,241,0.04)",
            }}
          >
            {/* ICD code chip */}
            <div
              className="mono-chip"
              style={{
                fontWeight: 700,
                color: "#22d3ee",
                minWidth: "54px",
                background: "rgba(6,182,212,0.08)",
                border: "1px solid rgba(6,182,212,0.18)",
                padding: "2px 7px",
                borderRadius: "5px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {m.code}
            </div>

            {/* Description */}
            <div
              style={{
                flex: 1,
                fontSize: "12px",
                color: "#94a3b8",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {m.description}
            </div>

            {/* Score + mini bar */}
            <div style={{ flexShrink: 0, textAlign: "right", minWidth: "42px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color,
                  marginBottom: "3px",
                }}
              >
                {(m.confidence * 100).toFixed(0)}%
              </div>
              <div
                style={{
                  width: "42px",
                  height: "3px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(m.confidence / maxConf) * 100}%` }}
                  transition={{ delay: i * 0.025 + 0.2, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    height: "100%",
                    background: color,
                    borderRadius: "99px",
                  }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ICD10Matches;
