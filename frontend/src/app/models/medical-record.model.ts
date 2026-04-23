export type RecordStatus = 'Active' | 'Treated' | 'Ongoing' | 'Critical';

export interface BackendMedicalRecord {
  recordId: number;
  patient?: {
    patientId: number;
    user?: { name?: string; userId?: number } | null;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
  } | null;
  doctor?: { doctorId: number } | null;
  hospital?: { hospitalId: number } | null;
  recordDate?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
}

export interface MedicalRecord {
  recordId: number;
  patientId: number;
  patientName: string;
  patientInitials: string;
  avatarBg: string;
  avatarColor: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  recordDate: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  status: RecordStatus;
}

export interface PatientSummary {
  patientId: number;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  lastVisit: string;
  recordCount: number;
  latestDiagnosis: string;
  status: RecordStatus;
}
