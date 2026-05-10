import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NextSession, ScheduledSession, PastSession } from '../models/patient-telemedicine.model';
import { PatientAuthService } from './patient-auth.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

const AVATAR_PALETTES = [
  { bg: '#E8F2FD', color: '#1A5FA8' },
  { bg: '#E6F5EF', color: '#0F7B50' },
  { bg: '#FEF3CD', color: '#B45309' },
  { bg: '#F3E8FF', color: '#7C3AED' },
  { bg: '#FEE2E2', color: '#B91C1C' },
];

export function computeTimeBadge(scheduledAt: string): { timeUntilLabel: string; timeBadgeClass: string } {
  const diffMs    = new Date(scheduledAt).getTime() - Date.now();
  const diffMins  = Math.ceil(diffMs / 60000);
  const diffHours = Math.ceil(diffMs / 3600000);
  const diffDays  = Math.ceil(diffMs / 86400000);

  if (diffMins < 60)  return { timeUntilLabel: `In ${diffMins}m`,  timeBadgeClass: 'b-blue' };
  if (diffHours < 24) return { timeUntilLabel: `In ${diffHours}h`, timeBadgeClass: 'b-blue' };
  if (diffDays === 1) return { timeUntilLabel: 'Tomorrow',          timeBadgeClass: 'b-blue' };
  if (diffDays === 2) return { timeUntilLabel: 'In 2 days',         timeBadgeClass: 'b-blue' };
  const d = new Date(scheduledAt);
  return { timeUntilLabel: `${d.toLocaleString('en-US',{month:'short'})} ${d.getDate()}`, timeBadgeClass: 'b-amber' };
}

function getInitials(name: string): string {
  return (name || '').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('') || 'DR';
}

function palette(index: number) {
  return AVATAR_PALETTES[index % AVATAR_PALETTES.length];
}

function toIso(date: string, time: string): string {
  return `${date}T${time ?? '00:00:00'}`;
}

function mapToScheduled(a: any, i: number): ScheduledSession {
  const iso = toIso(a.appointmentDate, a.appointmentTime);
  const name = a.doctor?.user?.name ?? 'Doctor';
  const p = palette(i);
  return {
    sessionId:          String(a.appointmentId),
    doctorName:         `Dr. ${name}`,
    doctorRole:         a.doctor?.specialization ?? 'Doctor',
    clinic:             a.hospital?.hospitalName ?? a.doctor?.hospital?.hospitalName ?? 'Clinic',
    doctorInitials:     getInitials(name),
    avatarBg:           p.bg,
    avatarColor:        p.color,
    scheduledAt:        iso,
    sessionType:        'Video',
    reason:             a.notes || 'Video consultation',
    durationEstMinutes: 30,
    status:             a.status === 'CONFIRMED' ? 'Confirmed' : a.status === 'CANCELLED' ? 'Cancelled' : 'Pending',
    joinUrl:            a.sessionUrl ?? undefined,
    ...computeTimeBadge(iso),
  };
}

function mapToPast(a: any): PastSession {
  return {
    sessionId:       String(a.appointmentId),
    doctorName:      `Dr. ${a.doctor?.user?.name ?? 'Doctor'}`,
    sessionDate:     toIso(a.appointmentDate, a.appointmentTime),
    sessionType:     'Video',
    durationMinutes: 0,
    reason:          a.notes || 'Video consultation',
    status:          a.status === 'CANCELLED' ? 'Cancelled' : a.status === 'NO_SHOW' ? 'No-show' : 'Completed',
  };
}

@Injectable({ providedIn: 'root' })
export class PatientTelemedicineService {

  constructor(private http: HttpClient, private auth: PatientAuthService) {}

  private getVideoAppointments(): Observable<any[]> {
    const userId = this.auth.getStoredUser()?.userId ?? 0;
    return this.http.get<any>(`${BASE}/patients/by-user/${userId}`).pipe(
      catchError(() => of(null)),
      switchMap(patient => {
        if (!patient?.patientId) return of([]);
        return this.http.get<any[]>(`${BASE}/appointments/patient/${patient.patientId}`).pipe(
          map(appts => appts.filter(a => a.appointmentType === 'VIDEO')),
          catchError(() => of([]))
        );
      })
    );
  }

  getNextSession(): Observable<NextSession | null> {
    return this.getVideoAppointments().pipe(
      map(appts => {
        const now = Date.now();
        const upcoming = appts
          .filter(a => a.status !== 'CANCELLED' && a.status !== 'COMPLETED')
          .map(a => ({ ...a, _ms: new Date(toIso(a.appointmentDate, a.appointmentTime)).getTime() }))
          .filter(a => a._ms > now)
          .sort((a, b) => a._ms - b._ms);

        if (!upcoming.length) return null;
        const a = upcoming[0];
        const iso = toIso(a.appointmentDate, a.appointmentTime);
        const name = a.doctor?.user?.name ?? 'Doctor';
        const minutesUntilStart = Math.ceil((a._ms - now) / 60000);
        return {
          sessionId:           String(a.appointmentId),
          doctorName:          `Dr. ${name}`,
          doctorRole:          a.doctor?.specialization ?? 'Doctor',
          clinic:              a.hospital?.hospitalName ?? a.doctor?.hospital?.hospitalName ?? 'Clinic',
          doctorInitials:      getInitials(name),
          scheduledAt:         iso,
          durationEstMinutes:  30,
          minutesUntilStart,
          joinUrl:             a.sessionUrl ?? undefined,
        } as NextSession;
      })
    );
  }

  getScheduledSessions(): Observable<ScheduledSession[]> {
    return this.getVideoAppointments().pipe(
      map(appts => {
        const now = Date.now();
        return appts
          .filter(a => a.status !== 'CANCELLED' && a.status !== 'COMPLETED')
          .filter(a => new Date(toIso(a.appointmentDate, a.appointmentTime)).getTime() > now)
          .sort((a, b) =>
            new Date(toIso(a.appointmentDate, a.appointmentTime)).getTime() -
            new Date(toIso(b.appointmentDate, b.appointmentTime)).getTime()
          )
          .map((a, i) => mapToScheduled(a, i));
      })
    );
  }

  getPastSessions(page = 1, pageSize = 10): Observable<{ data: PastSession[]; total: number }> {
    return this.getVideoAppointments().pipe(
      map(appts => {
        const now = Date.now();
        const past = appts
          .filter(a =>
            a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW' ||
            new Date(toIso(a.appointmentDate, a.appointmentTime)).getTime() < now
          )
          .sort((a, b) =>
            new Date(toIso(b.appointmentDate, b.appointmentTime)).getTime() -
            new Date(toIso(a.appointmentDate, a.appointmentTime)).getTime()
          )
          .map(mapToPast);
        const start = (page - 1) * pageSize;
        return { data: past.slice(start, start + pageSize), total: past.length };
      })
    );
  }

  getJoinUrl(sessionId: string): Observable<{ url: string }> {
    return this.http.get<any>(`${BASE}/appointments/${sessionId}`).pipe(
      map(a => ({ url: a.sessionUrl ?? '' })),
      catchError(() => of({ url: '' }))
    );
  }

  bookSession(data: { doctorId: number; date: string; time: string; reason: string }): Observable<any> {
    // booking is handled via the appointments API
    return this.http.post(`${BASE}/appointments`, {
      doctor:          { doctorId: data.doctorId },
      appointmentDate: data.date,
      appointmentTime: data.time,
      appointmentType: 'VIDEO',
      status:          'PENDING',
      notes:           data.reason,
    });
  }

  rescheduleSession(sessionId: string, newDate: string, newTime: string): Observable<ScheduledSession> {
    return this.http.get<any>(`${BASE}/appointments/${sessionId}`).pipe(
      switchMap(orig => this.http.put<any>(`${BASE}/appointments/${sessionId}`, {
        ...orig,
        appointmentDate: newDate,
        appointmentTime: newTime,
      })),
      map(a => mapToScheduled(a, 0)),
      catchError(() => of({} as ScheduledSession))
    );
  }

  cancelSession(sessionId: string): Observable<{ success: boolean }> {
    return this.http.get<any>(`${BASE}/appointments/${sessionId}`).pipe(
      switchMap(orig => this.http.put(`${BASE}/appointments/${sessionId}`, { ...orig, status: 'CANCELLED' })),
      map(() => ({ success: true })),
      catchError(() => of({ success: false }))
    );
  }
}
