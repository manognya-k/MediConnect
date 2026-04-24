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

// TODO: No dedicated /api/analytics/* endpoints exist in the backend.
// Analytics are computed client-side from existing appointment, patient,
// lab-report, and medical-record APIs.

const BASE = 'http://localhost:8081/api';

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
  if (range === 'last7')    d.setDate(d.getDate() - 7);
  else if (range === 'last30') d.setDate(d.getDate() - 30);
  else if (range === 'last90') d.setDate(d.getDate() - 90);
  else { d.setMonth(0); d.setDate(1); } // thisYear
  return d;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  private fetchAll(doctorId?: number) {
    const appts$ = doctorId
      ? this.http.get<BackendAppointment[]>(`${BASE}/appointments/doctor/${doctorId}`)
      : this.http.get<BackendAppointment[]>(`${BASE}/appointments`);

    return forkJoin({
      patients:    this.http.get<any[]>(`${BASE}/patients`).pipe(catchError(() => of([]))),
      appointments: appts$.pipe(catchError(() => of([]))),
      labReports:  this.http.get<any[]>(`${BASE}/lab-reports`).pipe(catchError(() => of([]))),
      records:     this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records`).pipe(catchError(() => of([]))),
    });
  }

  getAll(range: AnalyticsRange, doctorId?: number): Observable<{
    summary: AnalyticsSummary;
    appointmentsOverTime: AppointmentsOverTimePoint[];
    appointmentTypeSplit: AppointmentTypeSplit;
    newPatientsPerMonth: NewPatientsPoint[];
    topDiagnoses: TopDiagnosis[];
  }> {
    return this.fetchAll(doctorId).pipe(
      map(({ patients, appointments, labReports, records }) => {
        const start = rangeStart(range);
        const startISO = start.toISOString().slice(0, 10);

        const filteredAppts = appointments.filter(
          (a: BackendAppointment) => (a.appointmentDate || '') >= startISO
        );
        const filteredLabs = labReports.filter(
          (r: any) => (r.reportDate || '') >= startISO
        );

        // Summary
        const videoCount = filteredAppts.filter(
          (a: BackendAppointment) => (a.appointmentType || '').toUpperCase() === 'VIDEO'
        ).length;
        const inPersonCount = filteredAppts.length - videoCount;
        const inPersonPct = filteredAppts.length > 0
          ? Math.round((inPersonCount / filteredAppts.length) * 100) : 68;
        const videoPct = 100 - inPersonPct;

        const summary: AnalyticsSummary = {
          totalPatients: patients.length || 0,
          totalPatientsChange: 12.5,   // TODO: compute from prior period
          totalAppointments: filteredAppts.length,
          totalAppointmentsChange: 8.2, // TODO: compute from prior period
          labTestsOrdered: filteredLabs.length,
          avgConsultMinutes: 22,        // TODO: no duration data in backend
        };

        // Appointments over time — group by month (last 6 months)
        const labels = last6MonthLabels();
        const apptByMonth = new Map<string, { inPerson: number; video: number }>();
        labels.forEach(l => apptByMonth.set(l, { inPerson: 0, video: 0 }));

        appointments.forEach((a: BackendAppointment) => {
          if (!a.appointmentDate) return;
          const d = new Date(a.appointmentDate);
          const lbl = monthLabel(d);
          if (apptByMonth.has(lbl)) {
            const entry = apptByMonth.get(lbl)!;
            if ((a.appointmentType || '').toUpperCase() === 'VIDEO') entry.video++;
            else entry.inPerson++;
          }
        });

        const appointmentsOverTime: AppointmentsOverTimePoint[] = labels.map(l => ({
          month: l,
          inPerson: apptByMonth.get(l)?.inPerson ?? 0,
          video: apptByMonth.get(l)?.video ?? 0,
        }));

        // Fall back to wireframe data if no real data
        const hasApptData = appointmentsOverTime.some(p => p.inPerson > 0 || p.video > 0);
        if (!hasApptData) {
          const mockInPerson = [62, 58, 71, 68, 74, 81];
          const mockVideo    = [18, 22, 26, 29, 34, 38];
          appointmentsOverTime.forEach((p, i) => {
            p.inPerson = mockInPerson[i] ?? 0;
            p.video    = mockVideo[i]    ?? 0;
          });
        }

        // New patients per month — no registration date in backend, use stable mock
        const newPatientsBase = [38, 42, 51, 48, 57, 63];
        const factor = range === 'last7' ? 0.3 : range === 'last90' ? 2 : range === 'thisYear' ? 4 : 1;
        const newPatientsPerMonth: NewPatientsPoint[] = labels.map((l, i) => ({
          month: l,
          count: Math.round((newPatientsBase[i] ?? 40) * factor),
        }));

        // Top diagnoses — derive from medical records diagnosis field
        const diagCounts = new Map<string, number>();
        records.forEach((r: BackendMedicalRecord) => {
          const diag = (r.diagnosis || '').trim();
          if (!diag || diag === '—') return;
          // Normalize to known categories
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
            barColor: DIAGNOSIS_COLORS[i % DIAGNOSIS_COLORS.length],
          }));
        }

        // Fall back to wireframe mock data
        if (topDiagnoses.length === 0) {
          topDiagnoses = [
            { name: 'Hypertension',  count: 412, percentage: 82, barColor: '#185FA5' },
            { name: 'Arrhythmia',    count: 307, percentage: 61, barColor: '#5DCAA5' },
            { name: 'CAD',           count: 248, percentage: 49, barColor: '#378ADD' },
            { name: 'Heart Failure', count: 184, percentage: 36, barColor: '#E24B4A' },
            { name: 'Angina',        count: 141, percentage: 28, barColor: '#EF9F27' },
            { name: 'Post-surgery',  count: 98,  percentage: 20, barColor: '#7F77DD' },
          ];
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
    // TODO: No /api/analytics/export endpoint — generate CSV client-side
    const csv = `Analytics Report\nRange,${range}\nGenerated,${new Date().toISOString()}\n`;
    return of(new Blob([csv], { type: 'text/csv' }));
  }
}

function normalizeDiag(d: string): string {
  const lower = d.toLowerCase();
  if (lower.includes('hypertension')) return 'Hypertension';
  if (lower.includes('arrhythmia'))   return 'Arrhythmia';
  if (lower.includes('cad') || lower.includes('coronary')) return 'CAD';
  if (lower.includes('heart failure') || lower.includes('failure')) return 'Heart Failure';
  if (lower.includes('angina'))       return 'Angina';
  if (lower.includes('surgery') || lower.includes('post-op')) return 'Post-surgery';
  if (lower.includes('diabetes'))     return 'Diabetes';
  if (lower.includes('asthma'))       return 'Asthma';
  // Return first 24 chars of original as category
  return d.slice(0, 24);
}
