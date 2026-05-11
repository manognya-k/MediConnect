import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { MedicineStats, TimeSlot, ActivePrescription, DoseItem, DoseStatus } from '../models/patient-reminder.model';
import { PatientAuthService } from './patient-auth.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

// Infer time-slot from frequency string and optional scheduledTime
function inferTimes(frequency: string, scheduledTime?: string | null): string[] {
  const f = (frequency || '').toLowerCase();
  const base = scheduledTime?.trim() || '8:00 AM';

  if (f.includes('thrice') || f.includes('three') || f.includes('3×') || f.includes('tid'))
    return [base, '2:00 PM', '8:00 PM'];
  if (f.includes('twice') || f.includes('two') || f.includes('2×') || f.includes('bid'))
    return [base, '8:00 PM'];
  if (f.includes('night') || f.includes('bedtime') || f.includes('evening'))
    return ['9:00 PM'];
  return [base];
}

function to24hMinutes(time12: string): number {
  const [timePart, period] = time12.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function computeDoseStatus(time12: string): DoseStatus {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slotMin = to24hMinutes(time12);
  if (slotMin < nowMin - 30) return 'done';
  if (slotMin <= nowMin + 60) return 'next';
  return 'upcoming';
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTakenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(`reminders_taken_${todayKey()}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveTakenSet(taken: Set<string>): void {
  try {
    localStorage.setItem(`reminders_taken_${todayKey()}`, JSON.stringify([...taken]));
  } catch {}
}

function mapMedicines(raw: any[]): {
  prescriptions: ActivePrescription[];
  schedule: TimeSlot[];
  stats: MedicineStats;
} {
  const taken = getTakenSet();

  // Build ActivePrescription list from Medicine entities
  const prescriptions: ActivePrescription[] = raw.map(m => ({
    id:           String(m.id),
    medicineName: m.medicineName ?? 'Unknown',
    frequency:    m.frequency ?? 'Once daily',
    timing:       m.scheduledTime ?? '',
    indication:   '',
    prescribedBy: 'Doctor',
    refillDate:   '',
    status:       'Active' as const,
  }));

  // Build schedule: group doses by time slot
  const slotMap = new Map<string, DoseItem[]>();

  raw.forEach(m => {
    const times = inferTimes(m.frequency ?? '', m.scheduledTime);
    times.forEach((time, idx) => {
      const doseId = `${m.id}-${idx}`;
      const isTaken = taken.has(doseId);
      const autoStatus = computeDoseStatus(time);
      const status: DoseStatus = isTaken ? 'done' : autoStatus;
      const item: DoseItem = {
        doseId,
        medicineId:   String(m.id),
        medicineName: m.medicineName ?? 'Unknown',
        dosage:       m.dosage ?? '',
        status,
        isTaken,
      };
      const existing = slotMap.get(time) ?? [];
      existing.push(item);
      slotMap.set(time, existing);
    });
  });

  // Sort slots chronologically
  const schedule: TimeSlot[] = [...slotMap.entries()]
    .sort((a, b) => to24hMinutes(a[0]) - to24hMinutes(b[0]))
    .map(([time, doses]) => {
      const allDone = doses.every(d => d.isTaken);
      const anyNext = doses.some(d => d.status === 'next');
      const slotStatus: DoseStatus = allDone ? 'done' : anyNext ? 'next' : 'upcoming';
      return { time, status: slotStatus, doses };
    });

  // Stats
  const totalDoses = schedule.reduce((acc, s) => acc + s.doses.length, 0);
  const takenCount = schedule.reduce((acc, s) => acc + s.doses.filter(d => d.isTaken).length, 0);
  const dueCount   = totalDoses - takenCount;

  const stats: MedicineStats = {
    activeMedicines:  prescriptions.length,
    takenToday:       takenCount,
    dueToday:         dueCount,
    adherencePercent: totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0,
  };

  return { prescriptions, schedule, stats };
}

@Injectable({ providedIn: 'root' })
export class PatientRemindersService {

  constructor(
    private http: HttpClient,
    private auth: PatientAuthService,
  ) {}

  private getPatientId(): Observable<number> {
    const userId = this.auth.getStoredUser()?.userId ?? 0;
    return this.http.get<any>(`${BASE}/patients/by-user/${userId}`).pipe(
      map(p => p?.patientId ?? 0),
      catchError(() => of(0))
    );
  }

  private fetchMedicines(): Observable<any[]> {
    return this.getPatientId().pipe(
      switchMap(patientId => {
        if (!patientId) return of([]);
        return forkJoin({
          medicines:     this.http.get<any[]>(`${BASE}/patients/${patientId}/medicines`).pipe(catchError(() => of([]))),
          prescriptions: this.http.get<any[]>(`${BASE}/prescriptions/patient/${patientId}`).pipe(catchError(() => of([])))
        }).pipe(
          map(({ medicines, prescriptions }) => {
            // Medicines table (has scheduledTime) takes priority
            const nameSet = new Set(medicines.map((m: any) => (m.medicineName ?? '').toLowerCase()));
            // Convert prescriptions to medicine-compatible shape, skip those already in medicines table
            const rxAsMedicines = prescriptions
              .filter((p: any) => !nameSet.has((p.medicationName ?? '').toLowerCase()))
              .map((p: any) => ({
                id:           `rx-${p.id}`,
                medicineName: p.medicationName,
                dosage:       p.dosage,
                frequency:    p.instructions ?? 'Once daily',
                scheduledTime: null,
                status:       'ACTIVE',
              }));
            return [...medicines, ...rxAsMedicines];
          })
        );
      })
    );
  }

  getStats(): Observable<MedicineStats> {
    return this.fetchMedicines().pipe(
      map(raw => mapMedicines(raw).stats)
    );
  }

  getTodaySchedule(): Observable<TimeSlot[]> {
    return this.fetchMedicines().pipe(
      map(raw => mapMedicines(raw).schedule)
    );
  }

  getAllPrescriptions(): Observable<ActivePrescription[]> {
    return this.fetchMedicines().pipe(
      map(raw => mapMedicines(raw).prescriptions)
    );
  }

  markTaken(doseId: string): Observable<{ success: boolean }> {
    const taken = getTakenSet();
    taken.add(doseId);
    saveTakenSet(taken);
    return of({ success: true });
  }

  markUntaken(doseId: string): Observable<{ success: boolean }> {
    const taken = getTakenSet();
    taken.delete(doseId);
    saveTakenSet(taken);
    return of({ success: true });
  }
}
