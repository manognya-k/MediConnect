import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { NextSession, ScheduledSession, PastSession } from '../models/patient-telemedicine.model';

// ── Helper: compute time-until badge ─────────────────────────────────────────

export function computeTimeBadge(scheduledAt: string): { timeUntilLabel: string; timeBadgeClass: string } {
  const diffMs    = new Date(scheduledAt).getTime() - Date.now();
  const diffMins  = Math.ceil(diffMs / 60000);
  const diffHours = Math.ceil(diffMs / 3600000);
  const diffDays  = Math.ceil(diffMs / 86400000);

  if (diffMins < 60)  return { timeUntilLabel: `In ${diffMins}m`,  timeBadgeClass: 'b-blue' };
  if (diffHours < 24) return { timeUntilLabel: `In ${diffHours}h`, timeBadgeClass: 'b-blue' };
  if (diffDays === 1) return { timeUntilLabel: 'Tomorrow',          timeBadgeClass: 'b-blue' };
  if (diffDays === 2) return { timeUntilLabel: 'In 2 days',         timeBadgeClass: 'b-blue' };

  // More than 2 days — format as "MMM d"
  const d = new Date(scheduledAt);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day   = d.getDate();
  return { timeUntilLabel: `${month} ${day}`, timeBadgeClass: 'b-amber' };
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function makeFutureDate(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const MOCK_NEXT: NextSession = {
  sessionId: 'sess-hero',
  doctorName: 'Dr. Priya Mehta',
  doctorRole: 'General Physician',
  clinic: 'City Clinic',
  doctorInitials: 'PM',
  scheduledAt: makeFutureDate(0, new Date().getHours() + 1, 0), // 1 hour from now
  durationEstMinutes: 30,
  minutesUntilStart: 60
};

const MOCK_SCHEDULED: ScheduledSession[] = [
  {
    sessionId: 'sess-001',
    doctorName: 'Dr. Aisha Patel',
    doctorRole: 'Cardiologist',
    clinic: 'MediConnect Heart Centre',
    doctorInitials: 'AP',
    avatarBg: '#E8F2FD',
    avatarColor: '#1A5FA8',
    scheduledAt: makeFutureDate(2, 10, 30),
    sessionType: 'In-person',
    reason: 'Cardiology follow-up',
    durationEstMinutes: 30,
    status: 'Confirmed',
    ...computeTimeBadge(makeFutureDate(2, 10, 30))
  },
  {
    sessionId: 'sess-002',
    doctorName: 'Dr. Ramesh Gupta',
    doctorRole: 'Endocrinologist',
    clinic: 'MediConnect Metabolic Clinic',
    doctorInitials: 'RG',
    avatarBg: '#E6F5EF',
    avatarColor: '#0F7B50',
    scheduledAt: makeFutureDate(10, 11, 0),
    sessionType: 'In-person',
    reason: 'Diabetes review',
    durationEstMinutes: 45,
    status: 'Pending',
    ...computeTimeBadge(makeFutureDate(10, 11, 0))
  }
];

const MOCK_PAST: PastSession[] = [
  {
    sessionId: 'past-001',
    doctorName: 'Dr. Aisha Patel',
    sessionDate: new Date(Date.now() - 18 * 24 * 3600000).toISOString(),
    sessionType: 'In-person',
    durationMinutes: 28,
    reason: 'Hypertension review',
    status: 'Completed'
  },
  {
    sessionId: 'past-002',
    doctorName: 'Dr. Priya Mehta',
    sessionDate: new Date(Date.now() - 31 * 24 * 3600000).toISOString(),
    sessionType: 'Video',
    durationMinutes: 22,
    reason: 'General consultation',
    status: 'Completed'
  },
  {
    sessionId: 'past-003',
    doctorName: 'Dr. Ramesh Gupta',
    sessionDate: new Date(Date.now() - 54 * 24 * 3600000).toISOString(),
    sessionType: 'In-person',
    durationMinutes: 35,
    reason: 'Diabetes baseline',
    status: 'Completed'
  }
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PatientTelemedicineService {

  constructor(private http: HttpClient) {}

  /** TODO: wire to GET /api/patient/telemedicine/next */
  getNextSession(): Observable<NextSession | null> {
    const s = { ...MOCK_NEXT };
    s.minutesUntilStart = Math.ceil(
      (new Date(s.scheduledAt).getTime() - Date.now()) / 60000
    );
    return of(s);
  }

  /** TODO: wire to GET /api/patient/telemedicine/scheduled */
  getScheduledSessions(): Observable<ScheduledSession[]> {
    return of(MOCK_SCHEDULED.map(s => ({ ...s, ...computeTimeBadge(s.scheduledAt) })));
  }

  /** TODO: wire to GET /api/patient/telemedicine/past */
  getPastSessions(page = 1, pageSize = 10): Observable<{ data: PastSession[]; total: number }> {
    return of({ data: MOCK_PAST, total: MOCK_PAST.length });
  }

  /** TODO: wire to GET /api/patient/telemedicine/:sessionId/join */
  getJoinUrl(sessionId: string): Observable<{ url: string }> {
    return of({ url: `https://meet.mediconnect.example/session/${sessionId}` });
  }

  /** TODO: wire to POST /api/patient/telemedicine/book */
  bookSession(data: Partial<ScheduledSession>): Observable<ScheduledSession> {
    return of(MOCK_SCHEDULED[0]);
  }

  /** TODO: wire to PATCH /api/patient/telemedicine/:sessionId/reschedule */
  rescheduleSession(sessionId: string, newDate: string, newTime: string): Observable<ScheduledSession> {
    return of(MOCK_SCHEDULED[0]);
  }

  /** TODO: wire to PATCH /api/patient/telemedicine/:sessionId/cancel */
  cancelSession(sessionId: string): Observable<{ success: boolean }> {
    return of({ success: true });
  }
}
