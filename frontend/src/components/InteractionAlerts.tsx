import React, { useState } from "react";
import { DrugInteraction } from "../types";
import { AlertTriangle, Zap, Info, ShieldCheck, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InteractionAlertsProps {
  interactions: DrugInteraction[];
  demoExpandIdx?: number;
}

const SEV_CFG = {
  critical: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.2)",
    Icon: Zap,
    label: "CRITICAL",
    shape: "◆",
  },
  warning: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.2)",
    Icon: AlertTriangle,
    label: "WARNING",
    shape: "▲",
  },
  info: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.2)",
    Icon: Info,
    label: "INFO",
    shape: "●",
  },
};

const InteractionAlerts: React.FC<InteractionAlertsProps> = ({ interactions, demoExpandIdx }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  React.useEffect(() => {
    if (demoExpandIdx !== undefined) setExpandedIdx(demoExpandIdx);
  }, [demoExpandIdx]);

  if (interactions.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          background: "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.15)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "9px",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={16} color="#10b981" />
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#10b981" }}>
            No interactions detected
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            No drug-drug interactions or contraindications identified
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = interactions.filter((i) => i.severity === "critical").length;
  const warningCount = interactions.filter((i) => i.severity === "warning").length;

  return (
    <div>
      {/* Summary pills */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {criticalCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "7px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#ef4444",
            }}
            aria-label={`${criticalCount} critical drug interactions`}
          >
            <span aria-hidden="true">◆</span>
            {criticalCount} Critical
          </div>
        )}
        {warningCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "7px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#f59e0b",
            }}
            aria-label={`${warningCount} warning drug interactions`}
          >
            <span aria-hidden="true">▲</span>
            {warningCount} Warnings
          </div>
        )}
      </div>

      {/* Interaction cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {interactions.map((interaction, i) => {
          const cfg = SEV_CFG[interaction.severity as keyof typeof SEV_CFG] ?? SEV_CFG.info;
          const { Icon } = cfg;
          const isExpanded = expandedIdx === i;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "3px",
                  background: cfg.color,
                  opacity: 0.7,
                  borderRadius: "10px 0 0 10px",
                }}
              />

              {/* Main row */}
              <div
                role="button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedIdx(isExpanded ? null : i); }}
                tabIndex={0}
                style={{
                  padding: "12px 14px 12px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  userSelect: "none",
                  outline: "none",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "7px",
                    background: `${cfg.color}15`,
                    border: `1px solid ${cfg.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} color={cfg.color} aria-hidden="true" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      marginBottom: "4px",
                    }}
                  >
                    {/* Shape + label for colorblind accessibility */}
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: cfg.color,
                        background: `${cfg.color}18`,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${cfg.color}30`,
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span aria-hidden="true">{cfg.shape}</span>
                      {cfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {interaction.type.replace(/-/g, " ")}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#e2e8f0",
                      marginBottom: "3px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {interaction.drugs_involved.join(" + ")}
                    {interaction.condition_involved && (
                      <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                        {" "}× {interaction.condition_involved}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.55" }}>
                    {interaction.description}
                  </div>
                </div>

                {/* Expand arrow */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                >
                  <ChevronDown size={14} color="#64748b" />
                </motion.div>
              </div>

              {/* Expanded recommendation */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      style={{
                        padding: "12px 18px 14px",
                        borderTop: `1px solid ${cfg.border}`,
                        background: `${cfg.color}05`,
                      }}
                    >
                      <div className="section-label" style={{ marginBottom: "6px" }}>
                        Clinical Recommendation
                      </div>
                      <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.65" }}>
                        {interaction.clinical_recommendation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default InteractionAlerts;
