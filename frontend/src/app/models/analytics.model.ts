export type AnalyticsRange = 'last7' | 'last30' | 'last90' | 'thisYear';

export interface AnalyticsSummary {
  totalPatients: number;
  totalPatientsChange: number;
  totalAppointments: number;
  totalAppointmentsChange: number;
  labTestsOrdered: number;
  avgConsultMinutes: number;
}

export interface AppointmentsOverTimePoint {
  month: string;
  inPerson: number;
  video: number;
}

export interface AppointmentTypeSplit {
  inPersonPercent: number;
  videoPercent: number;
}

export interface NewPatientsPoint {
  month: string;
  count: number;
}

export interface TopDiagnosis {
  name: string;
  count: number;
  percentage: number;
  barColor: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  appointmentsOverTime: AppointmentsOverTimePoint[];
  appointmentTypeSplit: AppointmentTypeSplit;
  newPatientsPerMonth: NewPatientsPoint[];
  topDiagnoses: TopDiagnosis[];
}
