import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { MedicineStats, TimeSlot, ActivePrescription } from '../models/patient-reminder.model';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_STATS: MedicineStats = {
  activeMedicines: 4,
  takenToday: 2,
  dueToday: 2,
  adherencePercent: 87
};

const MOCK_SCHEDULE: TimeSlot[] = [
  {
    time: '8:00 AM',
    status: 'done',
    doses: [
      {
        doseId: 'dose-001',
        medicineId: 'med-001',
        medicineName: 'Amlodipine 5mg',
        dosage: '1 tablet · After breakfast',
        status: 'done',
        isTaken: true
      },
      {
        doseId: 'dose-002',
        medicineId: 'med-003',
        medicineName: 'Aspirin 75mg',
        dosage: '1 tablet · After breakfast',
        status: 'done',
        isTaken: true
      }
    ]
  },
  {
    time: '2:00 PM',
    status: 'next',
    doses: [
      {
        doseId: 'dose-003',
        medicineId: 'med-002',
        medicineName: 'Metformin 500mg',
        dosage: '1 tablet · With lunch',
        status: 'next',
        isTaken: false
      }
    ]
  },
  {
    time: '8:00 PM',
    status: 'upcoming',
    doses: [
      {
        doseId: 'dose-004',
        medicineId: 'med-004',
        medicineName: 'Lisinopril 10mg',
        dosage: '1 tablet · After dinner',
        status: 'upcoming',
        isTaken: false
      }
    ]
  }
];

const MOCK_PRESCRIPTIONS: ActivePrescription[] = [
  {
    id: 'med-001',
    medicineName: 'Amlodipine 5mg',
    frequency: '1× daily',
    timing: 'Morning',
    indication: 'Hypertension',
    prescribedBy: 'Dr. Aisha Patel',
    refillDate: '2025-05-15',
    status: 'Active'
  },
  {
    id: 'med-002',
    medicineName: 'Metformin 500mg',
    frequency: '2× daily',
    timing: 'Meals',
    indication: 'Type 2 Diabetes',
    prescribedBy: 'Dr. Ramesh Gupta',
    refillDate: '2025-05-10',
    status: 'Active'
  },
  {
    id: 'med-003',
    medicineName: 'Aspirin 75mg',
    frequency: '1× daily',
    timing: 'After breakfast',
    indication: 'Cardiac',
    prescribedBy: 'Dr. Aisha Patel',
    refillDate: '2025-06-01',
    status: 'Active'
  },
  {
    id: 'med-004',
    medicineName: 'Lisinopril 10mg',
    frequency: '1× daily',
    timing: 'Evening',
    indication: 'Hypertension',
    prescribedBy: 'Dr. Aisha Patel',
    refillDate: '2025-05-20',
    status: 'Active'
  }
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PatientRemindersService {

  constructor(private http: HttpClient) {}

  /** TODO: wire to GET /api/patient/medicines/stats */
  getStats(): Observable<MedicineStats> {
    return of({ ...MOCK_STATS });
  }

  /** TODO: wire to GET /api/patient/medicines/today */
  getTodaySchedule(): Observable<TimeSlot[]> {
    // Deep-copy so component mutations don't affect the mock
    return of(JSON.parse(JSON.stringify(MOCK_SCHEDULE)));
  }

  /** TODO: wire to GET /api/patient/medicines */
  getAllPrescriptions(): Observable<ActivePrescription[]> {
    return of(MOCK_PRESCRIPTIONS);
  }

  /** TODO: wire to PATCH /api/patient/medicines/{doseId}/taken */
  markTaken(doseId: string): Observable<{ success: boolean }> {
    return of({ success: true });
  }

  /** TODO: wire to PATCH /api/patient/medicines/{doseId}/untaken */
  markUntaken(doseId: string): Observable<{ success: boolean }> {
    return of({ success: true });
  }
}
