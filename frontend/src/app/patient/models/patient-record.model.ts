export type RecordType = 'Consultation' | 'Surgery' | 'Emergency' | 'Prescription' | 'Checkup' | 'Referral';

export interface PatientRecordSummary {
  id: string;
  title: string;
  type: RecordType;
  date: Date;
  doctorName: string;
  specialty: string;
  /** Short one-liner shown in the list */
  snippet: string;
  /** Whether this record has flagged items (shows red dot) */
  hasAlert: boolean;
}

export interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface TimelineItem {
  id: string;
  date: Date;
  title: string;
  description: string;
  isLatest: boolean;
}

export interface PatientRecordDetail {
  id: string;
  title: string;
  type: RecordType;
  date: Date;
  doctorName: string;
  specialty: string;
  hospital: string;
  consultationType: string;

  /** Clinical narrative */
  chiefComplaint: string;
  diagnosis: string;
  treatment: string;
  notes: string;

  /** Vitals */
  vitals: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    weight: string;
    height: string;
    bmi: string;
  } | null;

  prescriptions: Prescription[];
  timeline: TimelineItem[];
}
