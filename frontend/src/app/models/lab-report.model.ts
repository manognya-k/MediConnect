export type LabReportStatus = 'Pending' | 'Ready' | 'Abnormal';

// Backend entity shape — result field doubles as status ('PENDING'|'NORMAL'|'ABNORMAL') or free text
export interface BackendLabReport {
  reportId: number;
  testName?: string;
  result?: string;       // 'PENDING' | 'NORMAL' | 'ABNORMAL' | free text
  reportDate?: string;   // 'YYYY-MM-DD'
  patient?: { patientId: number; user?: { userId?: number; name: string } } | null;
  doctor?: { doctorId: number } | null;
}

export interface LabReport {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientInitials: string;
  avatarBg: string;
  avatarColor: string;
  testName: string;
  reportDate: string;       // 'YYYY-MM-DD'
  result: string | null;
  resultSummary: string;    // display string: "Processing…" | actual text
  isAbnormal: boolean;
  status: LabReportStatus;
  raw: BackendLabReport;
}

export interface LabReportStats {
  totalThisMonth: number;
  pending: number;
  abnormalFlags: number;
  completedToday: number;
  completedYesterday: number;
}

export interface LabReportFilter {
  page: number;
  pageSize: number;
  search?: string;
  testType?: string;
  status?: string;
  date?: string;
}

export interface PagedLabReports {
  data: LabReport[];
  total: number;
  stats: LabReportStats;
}
