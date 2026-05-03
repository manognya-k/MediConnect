export type LabReportStatus = 'Abnormal' | 'Normal' | 'Pending';
export type ResultFlag = 'HIGH' | 'LOW' | 'Borderline' | 'Slightly High' | 'Normal' | null;

export interface LabResultItem {
  id: string;
  label: string;        // "LDL Cholesterol"
  value: string;        // "185 mg/dL ↑"
  normalRange: string;  // "Normal: < 100 mg/dL"
  flag: ResultFlag;
  valueColor: string;   // '#B91C1C' HIGH, '#0F7B50' Normal, '#B45309' Borderline, '#0D2B4E' null
  cellBg: string;       // '#FEE2E2' HIGH, '#FEF3CD' Borderline/SH, '#F2F4F8' otherwise
  flagColor: string;    // same palette as valueColor
}

export interface PatientLabReport {
  id: string;
  testName: string;       // "Lipid Panel"
  orderedBy: string;      // "Dr. Sarah Johnson"
  reportDate: string;     // ISO "2026-04-18"
  status: LabReportStatus;
  isFlagged: boolean;     // true when status === 'Abnormal'
  isExpanded: boolean;    // accordion state (frontend-only)
  results: LabResultItem[];
  iconBg: string;         // '#FEE2E2' | '#E6F5EF' | '#FEF3CD'
  iconStroke: string;     // '#B91C1C' | '#0F7B50' | '#B45309'
  reportFileUrl?: string;
}

export interface FlaggedAlert {
  reportId: string;
  testName: string;       // "Lipid Panel"
  flaggedMetric: string;  // "elevated LDL cholesterol (185 mg/dL)"
  doctorName: string;     // "Dr. Johnson"
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}
