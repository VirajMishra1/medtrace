import React, { useState } from "react";
import { CostAnalysisResponse } from "../types";

interface Props { data: CostAnalysisResponse; }

const TIER_CFG = {
  low:      { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  label: "LOW COST",      badge: "badge-safe" },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "MEDIUM COST",   badge: "badge-warning" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.2)",  label: "HIGH COST",     badge: "badge-warning" },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   label: "CRITICAL COST", badge: "badge-critical" },
} as const;

const CAT_CFG: Record<string, { color: string; abbr: string }> = {
  medication:   { color: "#10b981", abbr: "RX" },
  procedure:    { color: "#0ea5e9", abbr: "PR" },
  comorbidity:  { color: "#f59e0b", abbr: "CM" },
  demographic:  { color: "#64748b", abbr: "DM" },
};

const UtilBar: React.FC<{ label: string; value: number; color: string; isPrimary: boolean }> = (
  { label, value, color, isPrimary }
) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: isPrimary ? "#e2e8f0" : "#94a3b8", fontWeight: isPrimary ? 600 : 400 }}>
          {label}
        </span>
        {isPrimary && (
          <span style={{
            fontSize: "9px", padding: "1px 5px",
            background: `${color}22`, color, border: `1px solid ${color}44`,
            borderRadius: "3px", fontWeight: 700,
          }}>PRIMARY</span>
        )}
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color }}>{Math.round(value * 100)}%</span>
    </div>
    <div className="confidence-bar-track">
      <div className="confidence-bar-fill" style={{
        width: `${value * 100}%`,
        background: `linear-gradient(90deg, ${color}77, ${color})`,
      }} />
    </div>
  </div>
);

const CostAnalysis: React.FC<Props> = ({ data }) => {
  const [tab, setTab] = useState<"drivers" | "utilization" | "opportunities">("drivers");
  const cfg = TIER_CFG[data.cost_tier as keyof typeof TIER_CFG] ?? TIER_CFG.medium;
  const maxPct = Math.max(...data.cost_drivers.map(d => d.estimated_contribution_pct), 1);

  const util = data.utilization;
  const utilItems = [
    { label: "ICU / Critical Care",   value: util.icu_probability,         color: "#ef4444" },
    { label: "General Ward",          value: util.ward_probability,        color: "#f59e0b" },
    { label: "Outpatient / Day Care", value: util.outpatient_probability,  color: "#10b981" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header: cost index gauge + summary */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* Cost index ring */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ position: "relative", width: "100px", height: "100px" }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="40" stroke={cfg.color}
                strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 40 * data.cost_index / 100} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: `drop-shadow(0 0 5px ${cfg.color}55)`, transition: "stroke-dasharray 0.8s ease" }} />
              <text x="50" y="46" textAnchor="middle" fill={cfg.color}
                fontSize="18" fontWeight="700" fontFamily="Inter,sans-serif">
                {Math.round(data.cost_index)}
              </text>
              <text x="50" y="59" textAnchor="middle" fill="#64748b"
                fontSize="8" fontFamily="Inter,sans-serif">/ 100</text>
            </svg>
          </div>
          <span className={`badge ${cfg.badge}`} style={{ fontSize: "9px" }}>{cfg.label}</span>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.65", marginBottom: "12px" }}>
            {data.cost_summary}
          </p>
          {/* LOS + setting pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ padding: "6px 12px", background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Est. Setting</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: cfg.color }}>{util.primary_setting}</div>
            </div>
            <div style={{ padding: "6px 12px", background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Est. LOS</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>
                {util.estimated_los_days_min}–{util.estimated_los_days_max} days
              </div>
            </div>
            <div style={{ padding: "6px 12px", background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#475569", marginBottom: "2px" }}>Cost Drivers</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>{data.cost_drivers.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
        {(["drivers", "utilization", "opportunities"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 12px", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: tab === t ? "#0ea5e9" : "#475569",
            borderBottom: tab === t ? "2px solid #0ea5e9" : "2px solid transparent",
            transition: "color 0.15s",
          }}>
            {t === "drivers" ? "Cost Drivers" : t === "utilization" ? "Utilization" : "Opportunities"}
          </button>
        ))}
      </div>

      {/* Drivers tab */}
      {tab === "drivers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.cost_drivers.map((d, i) => {
            const catCfg = CAT_CFG[d.category] ?? { color: "#64748b", icon: "•" };
            return (
              <div key={i} className="fade-in" style={{
                padding: "10px 12px", background: "var(--bg-sunken)",
                border: "1px solid var(--border-subtle)", borderRadius: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "6px" }}>
                  <div style={{
                    flexShrink: 0, width: "24px", height: "24px", borderRadius: "4px",
                    background: `${catCfg.color}14`, border: `1px solid ${catCfg.color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: "8px", fontWeight: 700,
                    color: catCfg.color, letterSpacing: "0.04em",
                  }}>{catCfg.abbr}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>{d.driver}</span>
                      <span style={{
                        fontSize: "9px", padding: "1px 5px",
                        background: `${catCfg.color}22`, color: catCfg.color,
                        border: `1px solid ${catCfg.color}44`, borderRadius: "3px",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>{d.category}</span>
                    </div>
                    {d.rationale && (
                      <p style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.5" }}>{d.rationale}</p>
                    )}
                    {d.icd10_codes.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                        {d.icd10_codes.map(c => (
                          <span key={c} style={{
                            fontSize: "10px", fontFamily: "var(--font-mono)", padding: "1px 5px",
                            background: "rgba(14,165,233,0.08)", color: "#22d3ee",
                            border: "1px solid rgba(139,92,246,0.2)", borderRadius: "3px",
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: catCfg.color }}>
                      {Math.round(d.estimated_contribution_pct)}%
                    </span>
                  </div>
                </div>
                <div className="confidence-bar-track">
                  <div className="confidence-bar-fill" style={{
                    width: `${(d.estimated_contribution_pct / maxPct) * 100}%`,
                    background: `linear-gradient(90deg, ${catCfg.color}66, ${catCfg.color})`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Utilization tab */}
      {tab === "utilization" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Utilization bars */}
          <div style={{
            padding: "16px", background: "var(--bg-sunken)",
            border: "1px solid var(--border-subtle)", borderRadius: "6px",
            display: "flex", flexDirection: "column", gap: "14px",
          }}>
            {utilItems.map(item => (
              <UtilBar
                key={item.label} label={item.label} value={item.value} color={item.color}
                isPrimary={util.primary_setting === item.label.split(" ")[0]}
              />
            ))}
          </div>

          {/* LOS detail */}
          <div style={{
            padding: "14px 16px", background: "var(--bg-sunken)",
            border: "1px solid var(--border-subtle)", borderRadius: "6px",
          }}>
            <div className="section-label" style={{ marginBottom: "12px" }}>
              Length of Stay Estimate
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* LOS timeline */}
              <div style={{ flex: 1, position: "relative", height: "24px" }}>
                <div style={{
                  position: "absolute", left: 0, right: 0, top: "50%",
                  height: "2px", background: "var(--border-subtle)", transform: "translateY(-50%)",
                }} />
                {[0, 7, 14, 21, 30].map(day => (
                  <div key={day} style={{
                    position: "absolute", left: `${(day / 30) * 100}%`,
                    top: "50%", transform: "translate(-50%, -50%)",
                  }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                    <div style={{
                      position: "absolute", top: "10px", left: "50%",
                      transform: "translateX(-50%)", fontSize: "9px", color: "#475569", whiteSpace: "nowrap",
                    }}>{day}d</div>
                  </div>
                ))}
                {/* Range highlight */}
                <div style={{
                  position: "absolute",
                  left: `${(util.estimated_los_days_min / 30) * 100}%`,
                  width: `${((util.estimated_los_days_max - util.estimated_los_days_min) / 30) * 100}%`,
                  top: "50%", height: "6px", transform: "translateY(-50%)",
                  background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                  borderRadius: "3px",
                }} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                {util.estimated_los_days_min}–{util.estimated_los_days_max} days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities tab */}
      {tab === "opportunities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.reduction_opportunities.map((opp, i) => (
            <div key={i} className="fade-in" style={{
              padding: "12px 14px",
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: "6px",
              display: "flex", alignItems: "flex-start", gap: "10px",
            }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: "11px", color: "#10b981", fontWeight: 700,
              }}>{i + 1}</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.6", flex: 1 }}>{opp}</p>
            </div>
          ))}
          {data.reduction_opportunities.length === 0 && (
            <p style={{ fontSize: "12px", color: "#475569", padding: "12px" }}>
              No specific reduction opportunities identified.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CostAnalysis;
