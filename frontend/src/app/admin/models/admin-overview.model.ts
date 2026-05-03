// ── Stat cards ──────────────────────────────────────────────────────────────

export type StatAccent = 'teal' | 'green' | 'red' | 'amber' | 'blue';

export interface StatCard {
  accent:    StatAccent;
  icon:      'hospital' | 'patients' | 'icu' | 'revenue' | 'doctors';
  label:     string;
  value:     string;
  sub:       string;
  subAccent: StatAccent;
}

// ── Charts ───────────────────────────────────────────────────────────────────

export interface PatientInflowPoint {
  label:     string;
  inpatient: number;
  outpatient: number;
}

export interface DiseaseSlice {
  label: string;
  value: number;
  color: string;
}

export interface BedOccupancyBar {
  hospital:  string;
  occupied:  number;
  available: number;
}

export interface RevenuePoint {
  label:   string;
  revenue: number;
}

// ── Hospital map ─────────────────────────────────────────────────────────────

export type PinStatus = 'available' | 'limited' | 'critical';

export interface HospitalPin {
  name:    string;
  top:     string;
  left:    string;
  status:  PinStatus;
  beds:    string;
}

// ── AI Insights ──────────────────────────────────────────────────────────────

export interface AiInsight {
  dot:   string;
  html:  string;
}

// ── Combined overview response ────────────────────────────────────────────────

export interface AdminOverviewData {
  stats:          StatCard[];
  inflowData:     PatientInflowPoint[];
  diseaseData:    DiseaseSlice[];
  bedData:        BedOccupancyBar[];
  revenueData:    RevenuePoint[];
  hospitalPins:   HospitalPin[];
  aiInsights:     AiInsight[];
  lastUpdated:    Date;
}
