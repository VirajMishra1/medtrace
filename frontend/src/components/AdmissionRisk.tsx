import React, { useState } from "react";
import { AdmissionRiskResponse } from "../types";

interface Props { data: AdmissionRiskResponse; }

const RISK_COLORS = {
  low:      { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  label: "LOW RISK" },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  label: "MEDIUM RISK" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  label: "HIGH RISK" },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   label: "CRITICAL RISK" },
} as const;

const CAT_COLORS: Record<string, string> = {
  icd10: "#38bdf8", demographic: "#f59e0b",
  medication: "#10b981", comorbidity: "#22d3ee",
};

/* ── Circular gauge ─────────────────────────────────────────────────────────── */
const Gauge: React.FC<{ probability: number; riskLevel: string }> = ({ probability, riskLevel }) => {
  const cfg = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.medium;
  const pct = Math.round(probability * 100);
  const R = 52, cx = 64, cy = 64;
  const circumference = 2 * Math.PI * R;
  // 270° arc (from 135° to 405°)
  const arcLen = circumference * 0.75;
  const filled = arcLen * probability;
  const startAngle = 135;

  const polarToCart = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const describeArc = (startDeg: number, endDeg: number, r: number) => {
    const s = polarToCart(startDeg, r);
    const e = polarToCart(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        {/* Track */}
        <path d={describeArc(startAngle, startAngle + 270, R)}
          stroke="var(--border-subtle)" strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* Fill */}
        <path d={describeArc(startAngle, startAngle + 270 * probability, R)}
          stroke={cfg.color} strokeWidth="10" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${cfg.color}66)` }} />
        {/* Centre text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={cfg.color}
          fontSize="22" fontWeight="700" fontFamily="var(--font-sans)">
          {pct}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b"
          fontSize="10" fontFamily="var(--font-sans)">
          ADMISSION
        </text>
        <text x={cx} y={cy + 25} textAnchor="middle" fill="#64748b"
          fontSize="10" fontFamily="var(--font-sans)">
          RISK
        </text>
      </svg>
      <span className={`badge badge-${riskLevel === "medium" ? "warning" : riskLevel === "low" ? "safe" : "critical"}`}
        style={{ fontSize: "10px" }}>
        {cfg.label}
      </span>
    </div>
  );
};

const AdmissionRisk: React.FC<Props> = ({ data }) => {
  const [tab, setTab] = useState<"factors" | "scenarios">("scenarios");
  const cfg = RISK_COLORS[data.risk_level as keyof typeof RISK_COLORS] ?? RISK_COLORS.medium;
  const maxContrib = Math.max(...data.risk_factors.map(f => f.contribution), 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Top row: gauge + summary */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <Gauge probability={data.admission_probability} riskLevel={data.risk_level} />

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.65", marginBottom: "12px" }}>
            {data.clinical_summary}
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { label: "Risk level", value: data.risk_level.toUpperCase() },
              { label: "Risk factors", value: String(data.risk_factors.length) },
              { label: "Scenarios", value: String(data.simulation_scenarios.length) },
            ].map(s => (
              <div key={s.label} style={{
                padding: "6px 12px", background: "var(--bg-sunken)",
                border: "1px solid var(--border-subtle)", borderRadius: "6px",
              }}>
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>{s.label}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: cfg.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
        {(["scenarios", "factors"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 14px", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: tab === t ? "#0ea5e9" : "#475569",
            borderBottom: tab === t ? "2px solid #0ea5e9" : "2px solid transparent",
            transition: "color 0.15s",
          }}>
            {t === "scenarios" ? "Simulation Scenarios" : "Risk Factors"}
          </button>
        ))}
      </div>

      {/* Scenarios tab */}
      {tab === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.simulation_scenarios.map((sc, i) => {
            const scCfg = RISK_COLORS[sc.severity as keyof typeof RISK_COLORS] ?? RISK_COLORS.medium;
            const isWorse = sc.delta > 0;
            return (
              <div key={i} className="fade-in" style={{
                padding: "12px 14px", background: "var(--bg-sunken)",
                border: `1px solid ${scCfg.border}`, borderRadius: "6px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>{sc.scenario}</span>
                      <span className={`badge badge-${sc.severity === "medium" ? "warning" : sc.severity === "low" ? "safe" : "critical"}`}
                        style={{ fontSize: "9px" }}>
                        {sc.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{sc.condition_change}</p>
                    <span style={{ fontSize: "10px", color: "#475569" }}>⏱ {sc.timeframe}</span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: scCfg.color }}>
                      {Math.round(sc.new_probability * 100)}%
                    </div>
                    <div style={{
                      fontSize: "11px", fontWeight: 600,
                      color: isWorse ? "#ef4444" : "#10b981",
                    }}>
                      {isWorse ? "▲" : "▼"} {Math.abs(Math.round(sc.delta * 100))}pp
                    </div>
                  </div>
                </div>
                {/* Probability bar */}
                <div style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "9px", color: "#475569" }}>0%</span>
                    <span style={{ fontSize: "9px", color: "#475569" }}>100%</span>
                  </div>
                  <div className="confidence-bar-track">
                    {/* Baseline marker */}
                    <div style={{
                      position: "relative", height: "4px",
                    }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, height: "100%",
                        width: `${data.admission_probability * 100}%`,
                        background: "rgba(255,255,255,0.08)", borderRadius: "2px",
                      }} />
                      <div style={{
                        position: "absolute", left: 0, top: 0, height: "100%",
                        width: `${sc.new_probability * 100}%`,
                        background: `linear-gradient(90deg, ${scCfg.color}88, ${scCfg.color})`,
                        borderRadius: "2px", transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk factors tab */}
      {tab === "factors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {data.risk_factors.slice(0, 8).map((f, i) => (
            <div key={i} className="fade-in" style={{
              padding: "9px 12px", background: "var(--bg-sunken)",
              border: "1px solid var(--border-subtle)", borderRadius: "5px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                <span style={{
                  fontSize: "9px", fontWeight: 700, padding: "1px 6px",
                  background: `${CAT_COLORS[f.category] ?? "#64748b"}22`,
                  color: CAT_COLORS[f.category] ?? "#64748b",
                  border: `1px solid ${CAT_COLORS[f.category] ?? "#64748b"}44`,
                  borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {f.category}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8", flex: 1 }}>{f.factor}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                  {Math.round(f.contribution * 100)}%
                </span>
              </div>
              <div className="confidence-bar-track">
                <div className="confidence-bar-fill" style={{
                  width: `${(f.contribution / maxContrib) * 100}%`,
                  background: `linear-gradient(90deg, ${cfg.color}66, ${cfg.color})`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology note */}
      <div style={{
        padding: "10px 12px", background: "var(--bg-sunken)",
        border: "1px solid var(--border-subtle)", borderRadius: "6px",
        fontSize: "10px", color: "#475569", lineHeight: "1.5",
      }}>
        <span style={{ color: "#0ea5e9", fontWeight: 600 }}>Methodology: </span>
        {data.methodology_note}
      </div>
    </div>
  );
};

export default AdmissionRisk;
