import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  PatientUser, PatientHealthScore, PatientDashboardStats,
  PatientAppointment, PatientVitals, TodayMedicine,
  ActivityItem, PatientNotification
} from '../models/patient-dashboard.model';
import { PatientAuthService } from './patient-auth.service';

const BASE = environment.apiBase;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatMonthDay(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr);
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name.split(' ').filter(w => w).map(w => w[0].toUpperCase()).slice(0,2).join('');
}

function patientCode(id: number): string {
  return `PT-${String(id).padStart(4,'0')}`;
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return 'Recently';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Recently';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

@Injectable({ providedIn: 'root' })
export class PatientDashboardService {
  constructor(
    private http: HttpClient,
    private auth: PatientAuthService
  ) {}

  getCurrentUserId(): number | null {
    return this.auth.getStoredUser()?.userId ?? null;
  }

  /** Load all dashboard data in parallel */
  loadAll(): Observable<{
    patient:       PatientUser;
    healthScore:   PatientHealthScore;
    stats:         PatientDashboardStats;
    appointments:  PatientAppointment[];
    vitals:        PatientVitals;
    medicines:     TodayMedicine[];
    activity:      ActivityItem[];
    notifications: PatientNotification[];
  }> {
    const stored = this.auth.getStoredUser();
    const userId = stored?.userId ?? 0;

    return this.http.get<any>(`${BASE}/patients/by-user/${userId}`).pipe(
      catchError(() => of(null)),
      switchMap(raw => {
        const patientId = raw?.patientId ?? 0;
        return forkJoin({
          patientRaw:    of(raw),
          appointments:  patientId ? this.http.get<any[]>(`${BASE}/appointments/patient/${patientId}`).pipe(catchError(() => of([]))) : of([]),
          labReports:    patientId ? this.http.get<any[]>(`${BASE}/lab-reports/patient/${patientId}`).pipe(catchError(() => of([]))) : of([]),
          vitalsRaw:     patientId ? this.http.get<any>(`${BASE}/patients/${patientId}/vitals`).pipe(catchError(() => of(null))) : of(null),
          medicinesRaw:  patientId ? this.http.get<any[]>(`${BASE}/patients/${patientId}/medicines`).pipe(catchError(() => of([]))) : of([]),
          activitiesRaw: patientId ? this.http.get<any[]>(`${BASE}/patients/${patientId}/activities`).pipe(catchError(() => of([]))) : of([]),
          notifications: this.http.get<any[]>(`${BASE}/notifications/user/${userId}`).pipe(catchError(() => of([]))),
        });
      }),
      map(({ patientRaw: raw, appointments, labReports, vitalsRaw, medicinesRaw, activitiesRaw, notifications }) => {
        const patientId = raw?.patientId ?? 0;

        const patient: PatientUser = {
          id:          String(patientId),
          name:        stored?.name ?? 'Patient',
          patientCode: patientCode(patientId),
          age:         raw?.dateOfBirth ? calcAge(raw.dateOfBirth) : 0,
          gender:      raw?.gender ?? 'Unknown',
          bloodGroup:  raw?.bloodGroup ?? '—',
          initials:    getInitials(stored?.name ?? 'P'),
        };

        // appointments and labReports are already filtered by patientId via scoped API calls
        const myAppts = appointments;
        const myLabs  = labReports;

        const today    = new Date(); today.setHours(0,0,0,0);
        const upcoming = myAppts
          .filter((a: any) => new Date(a.appointmentDate) >= today && a.status !== 'CANCELLED')
          .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

        const pendingLabs = myLabs.filter((l: any) => !l.result || l.result === '' || l.result === 'PENDING');

        const unread = notifications.filter((n: any) => !n.isRead);

        // ── Stats ──
        const nextAppt = upcoming[0];
        let nextDate = '—';
        if (nextAppt) {
          const nd = new Date(nextAppt.appointmentDate);
          nextDate = `${MONTHS[nd.getMonth()]} ${nd.getDate()}`;
        }

        const stats: PatientDashboardStats = {
          upcomingAppointments: upcoming.length,
          nextAppointmentDate:  nextDate,
          pendingLabReports:    pendingLabs.length,
          labReportDueToday:    pendingLabs.length > 0,
          activePrescriptions:  medicinesRaw.length,
          unreadNotifications:  unread.length,
          urgentNotifications:  unread.length,
        };

        // ── Upcoming appointments (top 3) ──
        const apptList: PatientAppointment[] = upcoming.slice(0,3).map((a: any) => {
          const { day, month } = formatMonthDay(a.appointmentDate);
          const docName = a.doctor?.user?.name ?? 'Doctor';
          const spec    = a.doctor?.specialization ?? '';
          const hosp    = a.doctor?.hospital?.hospitalName ?? '';
          const type    = a.appointmentType === 'VIDEO' ? 'Video' : 'In-person';
          const status  = a.status === 'CONFIRMED' ? 'Confirmed'
                        : a.status === 'CANCELLED' ? 'Cancelled' : 'Pending';
          return {
            id: String(a.appointmentId),
            day, month,
            doctorName: docName,
            speciality: spec,
            hospital: hosp,
            time: formatTime(a.appointmentTime),
            type,
            status,
          } as PatientAppointment;
        });

        // Health score derived from available vitals.
        const systolic = Number((vitalsRaw?.bloodPressure ?? '').split('/')[0]);
        const heartRate = Number(vitalsRaw?.heartRate);
        const glucose = Number(vitalsRaw?.glucose);
        const bmi = Number(vitalsRaw?.bmi);
        const scoreParts = [
          Number.isFinite(systolic) ? (systolic <= 120 ? 25 : systolic <= 139 ? 20 : 12) : 0,
          Number.isFinite(heartRate) ? (heartRate >= 60 && heartRate <= 100 ? 25 : 15) : 0,
          Number.isFinite(glucose) ? (glucose <= 100 ? 25 : glucose <= 125 ? 18 : 12) : 0,
          Number.isFinite(bmi) ? (bmi >= 18.5 && bmi <= 24.9 ? 25 : 15) : 0,
        ];
        const score = scoreParts.reduce((sum, x) => sum + x, 0);
        const status: PatientHealthScore['status'] =
          score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
        const healthScore: PatientHealthScore = {
          score,
          status,
          strokeDashoffset: 283 - (score / 100 * 283),
        };

        const bpPercent = Number.isFinite(systolic) ? clampPercent((systolic / 180) * 100) : 0;
        const hrPercent = Number.isFinite(heartRate) ? clampPercent((heartRate / 140) * 100) : 0;
        const glucosePercent = Number.isFinite(glucose) ? clampPercent((glucose / 200) * 100) : 0;
        const bmiPercent = Number.isFinite(bmi) ? clampPercent((bmi / 40) * 100) : 0;

        const rawUpdatedAt = vitalsRaw?.lastUpdatedAt ?? null;
        const updatedDate = rawUpdatedAt ? new Date(rawUpdatedAt) : null;
        const lastUpdatedLabel =
          updatedDate && !Number.isNaN(updatedDate.getTime())
            ? `${MONTHS[updatedDate.getMonth()]} ${updatedDate.getDate()}`
            : 'N/A';

        const vitals: PatientVitals = {
          bloodPressure: vitalsRaw?.bloodPressure ? `${vitalsRaw.bloodPressure} mmHg` : 'N/A',
          bloodPressureColor: '#B45309',
          bloodPressurePercent: bpPercent,
          bloodPressureBar: 'linear-gradient(90deg,#F59E0B,#EF4444)',
          heartRate: Number.isFinite(heartRate) ? `${heartRate} bpm` : 'N/A',
          heartRateColor: '#0F7B50',
          heartRatePercent: hrPercent,
          heartRateBar: '#0F7B50',
          bloodGlucose: Number.isFinite(glucose) ? `${glucose} mg/dL` : 'N/A',
          bloodGlucoseColor: '#B45309',
          bloodGlucosePercent: glucosePercent,
          bloodGlucoseBar: 'linear-gradient(90deg,#22C55E,#F59E0B)',
          bmi: Number.isFinite(bmi) ? String(bmi) : 'N/A',
          bmiColor: '#0D1B2A',
          bmiPercent: bmiPercent,
          bmiBar: '#2272C3',
          lastUpdated: lastUpdatedLabel,
        };

        const medicines: TodayMedicine[] = medicinesRaw.map((m: any) => ({
          id: String(m.id),
          name: m.medicineName ?? 'Medicine',
          dosage: [m.dosage, m.frequency].filter(Boolean).join(' \u00b7 '),
          scheduledTime: m.scheduledTime ?? 'N/A',
          status: (m.status === 'taken' || m.status === 'due' || m.status === 'upcoming')
            ? m.status
            : 'upcoming',
        }));

        const activity: ActivityItem[] = activitiesRaw.map((a: any, i: number) => ({
          id: String(a.referenceId ?? i),
          text: a.text ?? 'Activity updated',
          timeAgo: relativeTime(a.eventAt),
          dotColor:
            a.type === 'APPOINTMENT' ? '#2272C3' :
            a.type === 'MEDICAL_RECORD' ? '#0F7B50' :
            '#8A94A6',
        }));

        // ── Notifications from real endpoint or mock ──
        const notifList: PatientNotification[] = notifications.slice(0,3).map((n: any, i: number) => ({
          id: String(n.notificationId ?? i),
          message: n.message ?? n.title ?? 'Notification',
          timeAgo: 'Recently',
          iconBg: '#E8F2FD',
          iconStroke: '#1A5FA8',
          iconType: 'bell' as const,
        }));

        return {
          patient,
          healthScore,
          stats,
          appointments: apptList,
          vitals,
          medicines,
          activity,
          notifications: notifList,
        };
      })
    );
  }
}
