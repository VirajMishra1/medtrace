import React from "react";
import { HealthStatus } from "../types";
import { Play, Square } from "lucide-react";

interface NavbarProps {
  health: HealthStatus | null;
  onHowItWorks?: () => void;
  onStartDemo?: () => void;
  demoRunning?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ health, onHowItWorks, onStartDemo, demoRunning }) => {
  const isOnline = health?.status === "ok";
  const isDegraded = health?.status === "degraded";

  const statusColor = isOnline ? "#10b981" : isDegraded ? "#f59e0b" : health === null ? "#556070" : "#ef4444";
  const statusLabel = health === null ? "CONNECTING" : isOnline ? "SYSTEMS NOMINAL" : isDegraded ? "DEGRADED" : "OFFLINE";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(7,7,13,0.9)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderBottom: "1px solid rgba(14,165,233,0.08)",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        {/* Logo mark */}
        <div
          style={{
            width: "30px",
            height: "30px",
            background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #06b6d4 100%)",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(14,165,233,0.4), 0 2px 4px rgba(0,0,0,0.5)",
            flexShrink: 0,
          }}
        >
          {/* Custom M icon using CSS */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 13V3l4 5 2-3 2 3 4-5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>

        {/* Name + slash + subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              background: "linear-gradient(90deg, #e8eef7 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            MedTrace
          </span>
          <span style={{ color: "rgba(14,165,233,0.35)", fontSize: "12px", fontWeight: 300 }}>/</span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(14,165,233,0.45)",
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
            }}
          >
            Clinical Intelligence
          </span>
        </div>

        {/* Thin separator */}
        <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.06)" }} />

        {/* Index data tags */}
        {health && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "2px 8px",
                borderRadius: "3px",
                background: "rgba(14,165,233,0.04)",
              }}
            >
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>
                {health.patient_count.toLocaleString()}
              </span>{" "}
              patients
            </div>
            <div
              style={{
                fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "2px 8px",
                borderRadius: "3px",
                background: "rgba(6,182,212,0.04)",
              }}
            >
              <span style={{ color: "#22d3ee", fontWeight: 600 }}>
                {health.icd10_count.toLocaleString()}
              </span>{" "}
              icd-10
            </div>
          </div>
        )}
      </div>

      {/* Right: How It Works + Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Demo button */}
        {onStartDemo && (
          <button
            onClick={onStartDemo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: demoRunning ? "rgba(239,68,68,0.08)" : "rgba(14,165,233,0.08)",
              border: `1px solid ${demoRunning ? "rgba(239,68,68,0.22)" : "rgba(14,165,233,0.22)"}`,
              borderRadius: "5px",
              padding: "5px 12px",
              cursor: "pointer",
              color: demoRunning ? "#ef4444" : "#0ea5e9",
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              transition: "all 0.15s ease",
            }}
          >
            {demoRunning
              ? <><div className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", color: "#ef4444" }} /> Recording</>
              : <><Play size={9} fill="currentColor" /> Auto Demo</>
            }
          </button>
        )}

        {onHowItWorks && (
          <button
            onClick={onHowItWorks}
            style={{
              background: "rgba(14,165,233,0.06)",
              border: "1px solid rgba(14,165,233,0.14)",
              borderRadius: "5px",
              padding: "5px 12px",
              cursor: "pointer",
              color: "#38bdf8",
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.14)";
            }}
          >
            How It Works
          </button>
        )}
        {/* LM Studio indicator */}
        {health && (
          <div
            style={{
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: health.lmstudio_connected ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: health.lmstudio_connected ? "#10b981" : "#ef4444",
              }}
            />
            LM Studio
          </div>
        )}

        <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.06)" }} />

        {/* Status pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "4px 12px",
            background: `${statusColor}08`,
            border: `1px solid ${statusColor}20`,
            borderRadius: "4px",
            fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.12em",
          }}
        >
          <div
            className={isOnline ? "pulse-dot" : ""}
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: statusColor,
              color: statusColor,
              flexShrink: 0,
            }}
          />
          <span style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
