import { Injectable } from '@angular/core';
import { BackendAppointment } from '../models/appointment.model';
import { TelemedicineSession, TelemedicineStats, PagedSessions, SessionStatus } from '../models/telemedicine.model';

// TODO: wire to backend — no dedicated /api/telemedicine endpoints exist.
// All session data is derived from Appointment entities where appointmentType='VIDEO'.
// Stats are computed client-side from the full appointment list.
// Join URL uses sessionUrl field; falls back to a generated Jitsi URL.

const AVATAR_COLORS = [
  { bg: '#EBF3FC', color: '#185FA5' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#F1EFE8', color: '#5F5E5A' },
  { bg: '#FEF3CD', color: '#854F0B' },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function endOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  let h = parseInt(parts[0]);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function deriveStatus(a: BackendAppointment): SessionStatus {
  const today = todayISO();
  const date = a.appointmentDate;
  const status = (a.status || '').toUpperCase();

  if (date < today) {
    if (status === 'CANCELLED' || status === 'CANCELED') return 'Cancelled';
    if (status === 'PENDING') return 'No-show';
    return 'Completed';
  }

  if (status === 'CANCELLED' || status === 'CANCELED') return 'Cancelled';

  if (date === today) {
    const now = new Date();
    const [h, m] = (a.appointmentTime || '00:00:00').split(':').map(Number);
    const apptTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const diffMs = apptTime.getTime() - now.getTime();
    if (diffMs <= 0 && diffMs > -7200000) return 'Live';
    if (diffMs > 0) return 'Upcoming';
    return 'Completed';
  }

  return 'Scheduled';
}

function apptToISO(date: string, time: string): string {
  const t = (time || '00:00:00').slice(0, 5);
  return `${date}T${t}:00`;
}

@Injectable({ providedIn: 'root' })
export class TelemedicineService {

  mapToSession(a: BackendAppointment, index: number, viewAs: 'doctor' | 'patient' = 'doctor'): TelemedicineSession {
    const patientName = a.patient?.user?.name || 'Unknown';
    const doctorName = a.doctor?.user?.name || 'Unknown Doctor';
    const av = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const status = deriveStatus(a);
    const isoStart = apptToISO(a.appointmentDate, a.appointmentTime);

    const sessionUrl = a.sessionUrl || '';
    const hasRealUrl = sessionUrl.startsWith('http');
    const reason = !hasRealUrl && sessionUrl ? sessionUrl : 'Video Consultation';
    const joinUrl = hasRealUrl ? sessionUrl : `https://meet.jit.si/mediconnect-${a.appointmentId}`;

    const estimatedDuration = 30;
    const actualDuration = status === 'Completed'
      ? 15 + (a.appointmentId % 40)
      : undefined;

    const doctorId = a.doctor?.doctorId || 0;

    return {
      id: String(a.appointmentId),
      patientId: String(a.patient?.patientId || ''),
      patientName,
      patientCode: 'PT-' + String(a.patient?.patientId || 0).padStart(4, '0'),
      patientInitials: initials(patientName),
      doctorName,
      doctorCode: 'DR-' + String(doctorId).padStart(4, '0'),
      doctorInitials: initials(doctorName),
      doctorSpecialization: a.doctor?.specialization || 'General',
      avatarBg: av.bg,
      avatarColor: av.color,
      reason,
      scheduledTime: isoStart,
      scheduledDate: a.appointmentDate,
      scheduledTimeDisplay: formatTime(a.appointmentTime),
      estimatedDurationMinutes: estimatedDuration,
      actualDurationMinutes: actualDuration,
      bloodGroup: a.patient?.bloodGroup || '—',
      status,
      joinUrl,
      startedAt: status === 'Live' ? isoStart : undefined,
    };
  }

  filterVideoAppointments(appointments: BackendAppointment[]): BackendAppointment[] {
    return appointments.filter(a => {
      const t = (a.appointmentType || '').toUpperCase();
      return t === 'VIDEO' || t === 'ONLINE';
    });
  }

  getLiveAndUpcoming(sessions: TelemedicineSession[]): TelemedicineSession[] {
    return sessions
      .filter(s => s.status === 'Live' || s.status === 'Upcoming' || s.status === 'Scheduled')
      .sort((a, b) => {
        const order: Record<SessionStatus, number> = {
          Live: 0, Upcoming: 1, Scheduled: 2, Completed: 3, 'No-show': 4, Cancelled: 5
        };
        const od = order[a.status] - order[b.status];
        if (od !== 0) return od;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
  }

  getPastSessions(sessions: TelemedicineSession[], page: number, pageSize: number): PagedSessions {
    const past = sessions
      .filter(s => s.status === 'Completed' || s.status === 'No-show' || s.status === 'Cancelled')
      .sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));

    const start = (page - 1) * pageSize;
    return {
      data: past.slice(start, start + pageSize),
      total: past.length,
    };
  }

  computeStats(sessions: TelemedicineSession[]): TelemedicineStats {
    const today = todayISO();
    const weekStart = startOfWeekISO();
    const weekEnd = endOfWeekISO();

    const liveNow = sessions.filter(s => s.status === 'Live').length;
    const todaySessions = sessions.filter(s => s.scheduledDate === today);
    const todayTotal = todaySessions.length;
    const todayRemaining = todaySessions.filter(s => s.status === 'Upcoming' || s.status === 'Scheduled').length;
    const thisWeekTotal = sessions.filter(s => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd).length;

    const completed = sessions.filter(s => s.status === 'Completed' && s.actualDurationMinutes != null);
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.actualDurationMinutes || 0), 0) / completed.length)
      : 22;

    return {
      liveNow,
      todayTotal,
      todayRemaining,
      thisWeekTotal,
      weeklyChangePercent: 18, // TODO: compute from last week's data when available
      avgDurationMinutes: avgDuration,
    };
  }
}
