import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PatientRecordSummary, PatientRecordDetail } from '../models/patient-record.model';
import { PatientAuthService } from './patient-auth.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

function mapBackendRecord(r: any, index: number): PatientRecordSummary {
  return {
    id: String(r.recordId ?? index),
    title: r.diagnosis ?? r.title ?? 'Medical Record',
    type: r.recordType ?? 'Consultation',
    date: r.recordDate ? new Date(r.recordDate) : new Date(),
    doctorName: r.doctor?.user?.name ? `Dr. ${r.doctor.user.name}` : 'Doctor',
    specialty: r.doctor?.specialization ?? '',
    snippet: r.notes?.substring(0, 60) ?? '',
    hasAlert: false,
  };
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SUMMARIES: PatientRecordSummary[] = [
  {
    id: 'rec-001',
    title: 'Annual Cardiac Checkup',
    type: 'Checkup',
    date: new Date('2025-03-10'),
    doctorName: 'Dr. Aisha Patel',
    specialty: 'Cardiology',
    snippet: 'Routine checkup — mild hypertension noted',
    hasAlert: true
  },
  {
    id: 'rec-002',
    title: 'Type 2 Diabetes Consultation',
    type: 'Consultation',
    date: new Date('2025-01-22'),
    doctorName: 'Dr. Ramesh Gupta',
    specialty: 'Endocrinology',
    snippet: 'HbA1c 7.4% — medication adjusted',
    hasAlert: false
  },
  {
    id: 'rec-003',
    title: 'Appendectomy',
    type: 'Surgery',
    date: new Date('2024-09-05'),
    doctorName: 'Dr. Sneha Iyer',
    specialty: 'General Surgery',
    snippet: 'Laparoscopic appendectomy — successful',
    hasAlert: false
  },
  {
    id: 'rec-004',
    title: 'Chest Pain – Emergency Visit',
    type: 'Emergency',
    date: new Date('2024-07-14'),
    doctorName: 'Dr. Kiran Mehta',
    specialty: 'Emergency Medicine',
    snippet: 'ECG normal, GERD likely — discharged',
    hasAlert: false
  },
  {
    id: 'rec-005',
    title: 'Lipid Management Follow-up',
    type: 'Consultation',
    date: new Date('2024-05-30'),
    doctorName: 'Dr. Aisha Patel',
    specialty: 'Cardiology',
    snippet: 'LDL elevated — statin initiated',
    hasAlert: true
  },
  {
    id: 'rec-006',
    title: 'Nephrology Referral',
    type: 'Referral',
    date: new Date('2024-03-18'),
    doctorName: 'Dr. Ramesh Gupta',
    specialty: 'Endocrinology',
    snippet: 'Referred for kidney function evaluation',
    hasAlert: false
  }
];

const MOCK_DETAILS: Record<string, PatientRecordDetail> = {
  'rec-001': {
    id: 'rec-001',
    title: 'Annual Cardiac Checkup',
    type: 'Checkup',
    date: new Date('2025-03-10'),
    doctorName: 'Dr. Aisha Patel',
    specialty: 'Cardiology',
    hospital: 'MediConnect Heart Centre',
    chiefComplaint: 'Routine annual cardiovascular examination. Patient reports occasional mild breathlessness on exertion.',
    diagnosis: 'Stage 1 Hypertension (BP 142/92 mmHg). Otherwise, cardiovascular function within acceptable limits.',
    notes: 'Patient advised to reduce sodium intake and increase aerobic activity to 30 min/day. Follow-up in 3 months. Echo and stress test deferred for now.',
    vitals: {
      bloodPressure: '142/92',
      heartRate: '78 bpm',
      temperature: '98.4°F',
      weight: '74 kg',
      height: '170 cm',
      bmi: '25.6'
    },
    prescriptions: [
      {
        id: 'rx-001',
        medicationName: 'Amlodipine',
        dosage: '5 mg',
        frequency: 'Once daily',
        duration: '3 months',
        notes: 'Take in the morning with water'
      },
      {
        id: 'rx-002',
        medicationName: 'Aspirin',
        dosage: '75 mg',
        frequency: 'Once daily',
        duration: 'Ongoing',
        notes: 'Take after meals'
      }
    ],
    timeline: [
      {
        id: 'tl-001',
        date: new Date('2025-03-10'),
        title: 'Annual Cardiac Checkup',
        description: 'Stage 1 Hypertension noted. Amlodipine prescribed.',
        isLatest: true
      },
      {
        id: 'tl-002',
        date: new Date('2024-05-30'),
        title: 'Lipid Management Follow-up',
        description: 'LDL elevated at 148 mg/dL. Statin initiated.',
        isLatest: false
      },
      {
        id: 'tl-003',
        date: new Date('2024-07-14'),
        title: 'Emergency Visit',
        description: 'Chest pain evaluated. ECG normal, GERD likely.',
        isLatest: false
      }
    ]
  },
  'rec-002': {
    id: 'rec-002',
    title: 'Type 2 Diabetes Consultation',
    type: 'Consultation',
    date: new Date('2025-01-22'),
    doctorName: 'Dr. Ramesh Gupta',
    specialty: 'Endocrinology',
    hospital: 'MediConnect Metabolic Clinic',
    chiefComplaint: 'Quarterly diabetes review. Patient reports increased fatigue and occasional thirst.',
    diagnosis: 'Type 2 Diabetes Mellitus — suboptimal glycaemic control. HbA1c 7.4% (target <7%).',
    notes: 'Metformin dose increased. Dietary counselling reinforced. SGLT2 inhibitor considered for next review if HbA1c remains above target.',
    vitals: {
      bloodPressure: '128/82',
      heartRate: '74 bpm',
      temperature: '98.2°F',
      weight: '77 kg',
      height: '170 cm',
      bmi: '26.6'
    },
    prescriptions: [
      {
        id: 'rx-003',
        medicationName: 'Metformin',
        dosage: '1000 mg',
        frequency: 'Twice daily',
        duration: 'Ongoing',
        notes: 'Take with meals to reduce GI side effects'
      }
    ],
    timeline: [
      {
        id: 'tl-004',
        date: new Date('2025-01-22'),
        title: 'Diabetes Consultation',
        description: 'HbA1c 7.4%. Metformin dose increased to 1000 mg BD.',
        isLatest: true
      },
      {
        id: 'tl-005',
        date: new Date('2024-10-15'),
        title: 'Diabetes Review',
        description: 'HbA1c 7.8%. Lifestyle modifications recommended.',
        isLatest: false
      }
    ]
  },
  'rec-003': {
    id: 'rec-003',
    title: 'Appendectomy',
    type: 'Surgery',
    date: new Date('2024-09-05'),
    doctorName: 'Dr. Sneha Iyer',
    specialty: 'General Surgery',
    hospital: 'MediConnect Surgical Centre',
    chiefComplaint: 'Acute right iliac fossa pain for 18 hours. Nausea and fever (38.6°C).',
    diagnosis: 'Acute appendicitis. Laparoscopic appendectomy performed under general anaesthesia.',
    notes: 'Procedure uncomplicated. Discharged on day 2 post-op. Wound care instructions given. Review in 2 weeks.',
    vitals: {
      bloodPressure: '118/76',
      heartRate: '92 bpm',
      temperature: '38.6°F',
      weight: '75 kg',
      height: '170 cm',
      bmi: '26.0'
    },
    prescriptions: [
      {
        id: 'rx-004',
        medicationName: 'Amoxicillin-Clavulanate',
        dosage: '625 mg',
        frequency: 'Thrice daily',
        duration: '7 days',
        notes: 'Complete the full course'
      },
      {
        id: 'rx-005',
        medicationName: 'Ibuprofen',
        dosage: '400 mg',
        frequency: 'As needed (max 3/day)',
        duration: '5 days',
        notes: 'Take after food'
      }
    ],
    timeline: [
      {
        id: 'tl-006',
        date: new Date('2024-09-05'),
        title: 'Appendectomy',
        description: 'Laparoscopic appendectomy — successful. Discharged day 2.',
        isLatest: true
      }
    ]
  },
  'rec-004': {
    id: 'rec-004',
    title: 'Chest Pain – Emergency Visit',
    type: 'Emergency',
    date: new Date('2024-07-14'),
    doctorName: 'Dr. Kiran Mehta',
    specialty: 'Emergency Medicine',
    hospital: 'MediConnect Emergency Department',
    chiefComplaint: 'Sudden onset central chest pain radiating to left shoulder. Duration: 2 hours.',
    diagnosis: 'Chest pain — non-cardiac origin. ECG, troponins normal. Likely gastroesophageal reflux disease (GERD).',
    notes: 'Stress ECG recommended outpatient. Antacids prescribed. Patient advised to avoid trigger foods and follow up with cardiologist.',
    vitals: {
      bloodPressure: '138/88',
      heartRate: '98 bpm',
      temperature: '98.6°F',
      weight: '75 kg',
      height: '170 cm',
      bmi: '26.0'
    },
    prescriptions: [
      {
        id: 'rx-006',
        medicationName: 'Pantoprazole',
        dosage: '40 mg',
        frequency: 'Once daily',
        duration: '4 weeks',
        notes: 'Take 30 minutes before breakfast'
      }
    ],
    timeline: [
      {
        id: 'tl-007',
        date: new Date('2024-07-14'),
        title: 'Emergency Visit — Chest Pain',
        description: 'ECG and troponins normal. GERD diagnosed. Pantoprazole started.',
        isLatest: true
      }
    ]
  },
  'rec-005': {
    id: 'rec-005',
    title: 'Lipid Management Follow-up',
    type: 'Consultation',
    date: new Date('2024-05-30'),
    doctorName: 'Dr. Aisha Patel',
    specialty: 'Cardiology',
    hospital: 'MediConnect Heart Centre',
    chiefComplaint: 'Follow-up for elevated lipid panel results from recent blood work.',
    diagnosis: 'Dyslipidaemia — LDL 148 mg/dL (elevated). Statin therapy initiated.',
    notes: 'Diet modification: Mediterranean diet recommended. Recheck lipids in 3 months. Patient counselled on cardiovascular risk.',
    vitals: {
      bloodPressure: '136/88',
      heartRate: '76 bpm',
      temperature: '98.4°F',
      weight: '75 kg',
      height: '170 cm',
      bmi: '26.0'
    },
    prescriptions: [
      {
        id: 'rx-007',
        medicationName: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'Once daily at bedtime',
        duration: 'Ongoing',
        notes: 'Monitor liver enzymes at 3 months'
      }
    ],
    timeline: [
      {
        id: 'tl-008',
        date: new Date('2024-05-30'),
        title: 'Lipid Management Follow-up',
        description: 'LDL 148 mg/dL. Atorvastatin 20 mg initiated.',
        isLatest: true
      }
    ]
  },
  'rec-006': {
    id: 'rec-006',
    title: 'Nephrology Referral',
    type: 'Referral',
    date: new Date('2024-03-18'),
    doctorName: 'Dr. Ramesh Gupta',
    specialty: 'Endocrinology',
    hospital: 'MediConnect Metabolic Clinic',
    chiefComplaint: 'Mildly raised creatinine (1.3 mg/dL) on routine labs — referred for specialist evaluation.',
    diagnosis: 'Possible early diabetic nephropathy. Nephrology referral for further assessment.',
    notes: 'Nephrology appointment scheduled. Patient to bring all previous lab results. Continue diabetes management as planned.',
    vitals: null,
    prescriptions: [],
    timeline: [
      {
        id: 'tl-009',
        date: new Date('2024-03-18'),
        title: 'Nephrology Referral',
        description: 'Creatinine mildly elevated. Referred to nephrology for diabetic kidney disease screening.',
        isLatest: true
      }
    ]
  }
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PatientRecordsService {
  private cachedRecords: PatientRecordSummary[] | null = null;

  constructor(private http: HttpClient, private auth: PatientAuthService) {}

  getRecordList(search = ''): Observable<PatientRecordSummary[]> {
    const stored = this.auth.getStoredUser();
    const userId = stored?.userId ?? 0;
    const source$ = this.cachedRecords
      ? of(this.cachedRecords)
      : this.http.get<any>(`${BASE}/patients/by-user/${userId}`).pipe(
          catchError(() => of(null)),
          switchMap(patient => {
            if (!patient?.patientId) return of(MOCK_SUMMARIES);
            return this.http.get<any[]>(`${BASE}/medical-records/patient/${patient.patientId}`).pipe(
              map(records => records.length > 0 ? records.map(mapBackendRecord) : MOCK_SUMMARIES),
              catchError(() => of(MOCK_SUMMARIES))
            );
          })
        );

    return source$.pipe(
      map(records => {
        this.cachedRecords = records;
        const q = search.trim().toLowerCase();
        return q
          ? records.filter(r =>
              r.title.toLowerCase().includes(q) ||
              r.doctorName.toLowerCase().includes(q) ||
              r.specialty.toLowerCase().includes(q) ||
              r.snippet.toLowerCase().includes(q)
            )
          : records;
      })
    );
  }

  getRecordDetail(id: string): Observable<PatientRecordDetail | null> {
    return of(MOCK_DETAILS[id] ?? null);
  }
}
