export interface AnalysisOptions {
  top_k_patients: number;
  top_k_icd10: number;
  check_interactions: boolean;
}

export interface SimilarPatient {
  patient_uid: string;
  age: number | null;
  gender: string | null;
  snippet: string;
  similarity_score: number;
  bm25_score: number | null;
  rrf_score: number;
}

export interface ICD10Match {
  code: string;
  description: string;
  confidence: number;
}

export interface Medication {
  drug_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
}

export interface DrugInteraction {
  type: "drug-drug" | "drug-condition" | "dosage-concern";
  severity: "critical" | "warning" | "info";
  drugs_involved: string[];
  condition_involved: string | null;
  description: string;
  clinical_recommendation: string;
}

export interface EvidenceItem {
  patient_uids: string[];
  icd10_codes: string[];
}

export interface Diagnosis {
  name: string;
  icd10_code: string | null;
  confidence_label: "high" | "medium" | "low";
  confidence_pct: number;
  clinical_reasoning: string;
  key_concerns: string[];
  medication_flags: string[];
  evidence: EvidenceItem;
}

// Prompt 2: Admission Risk
export interface RiskFactor {
  factor: string;
  contribution: number;
  icd10_code: string | null;
  category: string;
}

export interface SimulationScenario {
  scenario: string;
  condition_change: string;
  new_probability: number;
  delta: number;
  timeframe: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AdmissionRiskResponse {
  admission_probability: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_factors: RiskFactor[];
  simulation_scenarios: SimulationScenario[];
  clinical_summary: string;
  methodology_note: string;
}

// Prompt 4: Cost & Utilization
export interface CostDriver {
  driver: string;
  category: "medication" | "procedure" | "comorbidity" | "demographic";
  estimated_contribution_pct: number;
  icd10_codes: string[];
  rationale: string;
}

export interface UtilizationPrediction {
  icu_probability: number;
  ward_probability: number;
  outpatient_probability: number;
  estimated_los_days_min: number;
  estimated_los_days_max: number;
  primary_setting: string;
}

export interface CostAnalysisResponse {
  cost_tier: string;
  cost_index: number;
  cost_drivers: CostDriver[];
  utilization: UtilizationPrediction;
  reduction_opportunities: string[];
  cost_summary: string;
}

export interface AnalysisResponse {
  query_snippet: string;
  similar_patients: SimilarPatient[];
  icd10_matches: ICD10Match[];
  medications: Medication[];
  interactions: DrugInteraction[];
  diagnoses: Diagnosis[];
  admission_risk: AdmissionRiskResponse | null;
  cost_analysis: CostAnalysisResponse | null;
  processing_steps: string[];
}

export interface PatientRecord {
  patient_uid: string;
  age: number | null;
  gender: string | null;
  snippet: string;
  full_note?: string;
}

export interface HealthStatus {
  status: string;
  lmstudio_connected: boolean;
  patient_index_loaded: boolean;
  icd10_index_loaded: boolean;
  bm25_index_loaded: boolean;
  patient_count: number;
  icd10_count: number;
  details: Record<string, string>;
}
