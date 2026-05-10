import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  AnalyticsRange, AnalyticsSummary, AppointmentsOverTimePoint,
  AppointmentTypeSplit, NewPatientsPoint, TopDiagnosis
} from '../models/analytics.model';
import { BackendAppointment } from '../models/appointment.model';
import { BackendMedicalRecord } from '../models/medical-record.model';
import { environment } from '../../environments/environment';

const BASE = environment.apiBase;

const DIAGNOSIS_COLORS = [
  '#185FA5', '#5DCAA5', '#378ADD', '#E24B4A', '#EF9F27', '#7F77DD', '#3B6D11', '#993556'
];

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

function last6MonthLabels(): string[] {
  const labels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(monthLabel(d));
  }
  return labels;
}

function rangeStart(range: AnalyticsRange): Date {
  const d = new Date();
  if (range === 'last7')      d.setDate(d.getDate() - 7);
  else if (range === 'last30') d.setDate(d.getDate() - 30);
  else if (range === 'last90') d.setDate(d.getDate() - 90);
  else { d.setMonth(0); d.setDate(1); } // thisYear
  return d;
}

function normalizeDiag(d: string): string {
  const lower = d.toLowerCase();
  if (lower.includes('hypertension'))                          return 'Hypertension';
  if (lower.includes('arrhythmia'))                           return 'Arrhythmia';
  if (lower.includes('cad') || lower.includes('coronary'))    return 'CAD';
  if (lower.includes('heart failure') || lower.includes('failure')) return 'Heart Failure';
  if (lower.includes('angina'))                               return 'Angina';
  if (lower.includes('surgery') || lower.includes('post-op')) return 'Post-surgery';
  if (lower.includes('diabetes'))                             return 'Diabetes';
  if (lower.includes('asthma'))                               return 'Asthma';
  return d.slice(0, 24);
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  private fetchAll(doctorId?: number) {
    const appts$ = doctorId
      ? this.http.get<BackendAppointment[]>(`${BASE}/appointments/doctor/${doctorId}`)
      : this.http.get<BackendAppointment[]>(`${BASE}/appointments`);

    const patients$ = doctorId
      ? this.http.get<any[]>(`${BASE}/doctors/${doctorId}/patients`)
      : this.http.get<any[]>(`${BASE}/patients`);

    const records$ = doctorId
      ? this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records/doctor/${doctorId}`)
      : this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records`);

    return forkJoin({
      patients:     patients$.pipe(catchError(() => of([]))),
      appointments: appts$.pipe(catchError(() => of([]))),
      labReports:   this.http.get<any[]>(`${BASE}/lab-reports`).pipe(catchError(() => of([]))),
      records:      records$.pipe(catchError(() => of([]))),
    });
  }

  getAll(range: AnalyticsRange, doctorId?: number): Observable<{
    summary:              AnalyticsSummary;
    appointmentsOverTime: AppointmentsOverTimePoint[];
    appointmentTypeSplit: AppointmentTypeSplit;
    newPatientsPerMonth:  NewPatientsPoint[];
    topDiagnoses:         TopDiagnosis[];
  }> {
    return this.fetchAll(doctorId).pipe(
      map(({ patients, appointments, labReports, records }) => {
        const startISO = rangeStart(range).toISOString().slice(0, 10);

        const filteredAppts = appointments.filter(
          (a: BackendAppointment) => (a.appointmentDate || '') >= startISO
        );
        const filteredLabs = labReports.filter(
          (r: any) => (r.reportDate || '') >= startISO
        );

        // ── Type split ──────────────────────────────────────────────────────
        const videoCount     = filteredAppts.filter(
          (a: BackendAppointment) => (a.appointmentType || '').toUpperCase() === 'VIDEO'
        ).length;
        const inPersonCount  = filteredAppts.length - videoCount;
        const inPersonPct    = filteredAppts.length > 0
          ? Math.round((inPersonCount / filteredAppts.length) * 100) : 0;
        const videoPct       = filteredAppts.length > 0 ? 100 - inPersonPct : 0;

        // ── Summary ─────────────────────────────────────────────────────────
        const summary: AnalyticsSummary = {
          totalPatients:           patients.length,
          totalPatientsChange:     0,
          totalAppointments:       filteredAppts.length,
          totalAppointmentsChange: 0,
          labTestsOrdered:         filteredLabs.length,
          avgConsultMinutes:       0,
        };

        // ── Appointments over time (last 6 months) ──────────────────────────
        const labels = last6MonthLabels();
        const apptByMonth = new Map<string, { inPerson: number; video: number }>();
        labels.forEach(l => apptByMonth.set(l, { inPerson: 0, video: 0 }));

        appointments.forEach((a: BackendAppointment) => {
          if (!a.appointmentDate) return;
          const lbl = monthLabel(new Date(a.appointmentDate));
          if (apptByMonth.has(lbl)) {
            const entry = apptByMonth.get(lbl)!;
            if ((a.appointmentType || '').toUpperCase() === 'VIDEO') entry.video++;
            else entry.inPerson++;
          }
        });

        const appointmentsOverTime: AppointmentsOverTimePoint[] = labels.map(l => ({
          month:    l,
          inPerson: apptByMonth.get(l)?.inPerson ?? 0,
          video:    apptByMonth.get(l)?.video ?? 0,
        }));

        // ── Appointments per month (bar chart — real data) ──────────────────
        const apptCountByMonth = new Map<string, number>();
        labels.forEach(l => apptCountByMonth.set(l, 0));
        appointments.forEach((a: BackendAppointment) => {
          if (!a.appointmentDate) return;
          const lbl = monthLabel(new Date(a.appointmentDate));
          if (apptCountByMonth.has(lbl)) apptCountByMonth.set(lbl, apptCountByMonth.get(lbl)! + 1);
        });

        const newPatientsPerMonth: NewPatientsPoint[] = labels.map(l => ({
          month: l,
          count: apptCountByMonth.get(l) ?? 0,
        }));

        // ── Top diagnoses from real medical records ──────────────────────────
        const diagCounts = new Map<string, number>();
        records.forEach((r: BackendMedicalRecord) => {
          const diag = (r.diagnosis || '').trim();
          if (!diag || diag === '—') return;
          const key = normalizeDiag(diag);
          diagCounts.set(key, (diagCounts.get(key) || 0) + 1);
        });

        let topDiagnoses: TopDiagnosis[] = [];
        if (diagCounts.size > 0) {
          const sorted = [...diagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
          const maxCount = sorted[0][1];
          topDiagnoses = sorted.map(([name, count], i) => ({
            name,
            count,
            percentage: Math.round((count / maxCount) * 100),
            barColor:   DIAGNOSIS_COLORS[i % DIAGNOSIS_COLORS.length],
          }));
        }

        return {
          summary,
          appointmentsOverTime,
          appointmentTypeSplit: { inPersonPercent: inPersonPct, videoPercent: videoPct },
          newPatientsPerMonth,
          topDiagnoses,
        };
      })
    );
  }

  exportReport(range: AnalyticsRange): Observable<Blob> {
    const csv = `Analytics Report\nRange,${range}\nGenerated,${new Date().toISOString()}\n`;
    return of(new Blob([csv], { type: 'text/csv' }));
  }
}
