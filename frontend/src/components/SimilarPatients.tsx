import React, { useState } from "react";
import { SimilarPatient, PatientRecord } from "../types";
import { getPatient } from "../api";
import { User, Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SimilarPatientsProps {
  patients: SimilarPatient[];
  demoExpandFirst?: boolean;
}

const AVATAR_COLORS = [
  { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", color: "#4e5d6f" },
];

const SimilarPatients: React.FC<SimilarPatientsProps> = ({ patients, demoExpandFirst }) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [fullRecord, setFullRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  React.useEffect(() => {
    if (demoExpandFirst && patients.length > 0) handleSelect(patients[0].patient_uid);
  }, [demoExpandFirst]); // eslint-disable-line

  const handleSelect = async (uid: string) => {
    if (selectedUid === uid) {
      setSelectedUid(null);
      setFullRecord(null);
      setFetchError(false);
      return;
    }
    setSelectedUid(uid);
    setFetchError(false);
    setLoading(true);
    try {
      const record = await getPatient(uid);
      setFullRecord(record);
    } catch {
      setFullRecord(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const maxRrf = patients.length > 0 ? Math.max(...patients.map((p) => p.rrf_score)) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {patients.map((p, i) => {
        const avatarStyle = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const matchPct = (p.rrf_score / maxRrf) * 100;
        const isSelected = selectedUid === p.patient_uid;

        return (
          <motion.div
            key={p.patient_uid}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <motion.div
              onClick={() => handleSelect(p.patient_uid)}
              style={{
                padding: "10px 12px",
                background: isSelected ? "rgba(14,165,233,0.05)" : "rgba(5,5,12,0.5)",
                border: `1px solid ${
                  isSelected ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.045)"
                }`,
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              whileHover={{
                borderColor: "rgba(14,165,233,0.18)",
                background: "rgba(14,165,233,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "9px",
                    background: avatarStyle.bg,
                    border: `1px solid ${avatarStyle.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={14} color={avatarStyle.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span className="mono-chip" style={{ color: "#38bdf8", fontWeight: 600, fontSize: "11px" }}>
                      {p.patient_uid}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#475569",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        padding: "1px 6px",
                        borderRadius: "5px",
                      }}
                    >
                      {p.age ?? "?"} · {p.gender ?? "?"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      lineHeight: "1.5",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    } as React.CSSProperties}
                  >
                    {p.snippet}
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0ea5e9", lineHeight: 1 }}>
                    {matchPct.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: "9px", color: "#475569", marginTop: "3px" }}>RRF match</div>
                </div>

                {/* Expand icon */}
                <motion.div animate={{ rotate: isSelected ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} color="#475569" />
                </motion.div>
              </div>

              {/* Match bar */}
              <div className="confidence-bar-track" style={{ marginTop: "9px" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${matchPct}%` }}
                  transition={{ delay: i * 0.04 + 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  className="confidence-bar-fill"
                  style={{ background: "linear-gradient(90deg, #0284c7, #0ea5e9)" }}
                />
              </div>
            </motion.div>

            {/* Expanded note */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "14px",
                      background: "rgba(5,5,12,0.7)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#94a3b8",
                      lineHeight: "1.7",
                      maxHeight: "280px",
                      overflowY: "auto",
                    }}
                  >
                    {loading ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
                        <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        Loading full note...
                      </div>
                    ) : fetchError ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        <AlertCircle size={13} color="#475569" />
                        <span>
                          Full note unavailable — showing snippet
                        </span>
                      </div>
                    ) : fullRecord?.full_note ? (
                      fullRecord.full_note
                    ) : (
                      p.snippet
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default SimilarPatients;
