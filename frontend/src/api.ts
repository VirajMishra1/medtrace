import axios from "axios";
import { AnalysisOptions, AnalysisResponse, HealthStatus, PatientRecord } from "./types";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export const api = axios.create({ baseURL: BASE, timeout: 120000 });

export const analyzePatient = async (
  patient_note: string,
  options?: Partial<AnalysisOptions>
): Promise<AnalysisResponse> => {
  const { data } = await api.post<AnalysisResponse>("/analyze", {
    patient_note,
    options: {
      top_k_patients: 10,
      top_k_icd10: 15,
      check_interactions: true,
      ...options,
    },
  });
  return data;
};

export const getHealth = async (): Promise<HealthStatus> => {
  const { data } = await api.get<HealthStatus>("/health");
  return data;
};

export const getSamplePatients = async (n = 12): Promise<PatientRecord[]> => {
  const { data } = await api.get<PatientRecord[]>(`/patients/sample?n=${n}`);
  return data;
};

export const getPatient = async (uid: string): Promise<PatientRecord> => {
  const { data } = await api.get<PatientRecord>(`/patients/${uid}`);
  return data;
};
