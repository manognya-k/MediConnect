import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  BackendAppointment, Appointment, AppointmentStats,
  AppointmentFilter, PagedAppointments, AppointmentType, AppointmentStatus
} from '../models/appointment.model';

const BASE = 'http://localhost:8081/api';

const AVATAR_COLORS: Array<{ bg: string; color: string }> = [
  { bg: '#EBF3FC', color: '#185FA5' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#F1EFE8', color: '#5F5E5A' },
  { bg: '#FEF3CD', color: '#854F0B' },
];

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<BackendAppointment[]> {
    return this.http.get<BackendAppointment[]>(`${BASE}/appointments`);
  }

  getByDoctor(doctorId: number): Observable<BackendAppointment[]> {
    return this.http.get<BackendAppointment[]>(`${BASE}/appointments/doctor/${doctorId}`);
  }

  getByPatient(patientId: number): Observable<BackendAppointment[]> {
    return this.http.get<BackendAppointment[]>(`${BASE}/appointments/patient/${patientId}`);
  }

  getById(id: number): Observable<BackendAppointment> {
    return this.http.get<BackendAppointment>(`${BASE}/appointments/${id}`);
  }

  create(data: Partial<BackendAppointment>): Observable<BackendAppointment> {
    return this.http.post<BackendAppointment>(`${BASE}/appointments`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  update(id: number, data: Partial<BackendAppointment>): Observable<BackendAppointment> {
    return this.http.put<BackendAppointment>(`${BASE}/appointments/${id}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // TODO: backend has no /api/appointments/:id/cancel — using PUT with status change
  cancel(id: number, raw: BackendAppointment): Observable<BackendAppointment> {
    return this.http.put<BackendAppointment>(`${BASE}/appointments/${id}`, {
      ...raw,
      status: 'CANCELLED'
    }).pipe(catchError(err => throwError(() => err)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/appointments/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Client-side filtering, pagination, and stats computation
  applyFilter(all: BackendAppointment[], filter: AppointmentFilter): PagedAppointments {
    const today = this.todayISO();
    let filtered = [...all];

    // Tab filter (skip if explicit date is set)
    if (!filter.date) {
      if (filter.tab === 'today') {
        filtered = filtered.filter(a => a.appointmentDate === today);
      } else if (filter.tab === 'upcoming') {
        filtered = filtered.filter(a => a.appointmentDate > today);
      } else if (filter.tab === 'past') {
        filtered = filtered.filter(a => a.appointmentDate < today);
      }
    } else {
      filtered = filtered.filter(a => a.appointmentDate === filter.date);
    }

    // Type filter
    if (filter.type) {
      const t = filter.type.toLowerCase();
      filtered = filtered.filter(a => {
        const at = (a.appointmentType || '').toUpperCase();
        if (t === 'video') return at === 'VIDEO';
        if (t === 'in-person') return at === 'IN_PERSON' || at === 'IN-PERSON' || at === 'INPERSON';
        return true;
      });
    }

    // Status filter
    if (filter.status) {
      const s = filter.status.toUpperCase();
      filtered = filtered.filter(a => (a.status || '').toUpperCase() === s);
    }

    // Search filter
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(a => {
        const name = (a.patient?.user?.name || '').toLowerCase();
        const code = 'pt-' + String(a.patient?.patientId || '').padStart(4, '0');
        return name.includes(q) || code.includes(q);
      });
    }

    // Sort: upcoming/today asc, past desc
    filtered.sort((a, b) => {
      const dc = a.appointmentDate.localeCompare(b.appointmentDate);
      if (dc !== 0) return filter.tab === 'past' ? -dc : dc;
      return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
    });

    const total = filtered.length;
    const start = (filter.page - 1) * filter.pageSize;
    const page = filtered.slice(start, start + filter.pageSize);

    // Stats always computed from ALL today's appointments (unfiltered)
    const todayAll = all.filter(a => a.appointmentDate === today);
    const stats = this.computeStats(todayAll);

    return {
      data: page.map((a, i) => this.mapToUI(a, start + i)),
      total,
      stats
    };
  }

  mapToUI(a: BackendAppointment, index: number): Appointment {
    const name = a.patient?.user?.name || 'Unknown';
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    const { bg, color } = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const type = this.normalizeType(a.appointmentType);
    const status = this.normalizeStatus(a.status);
    return {
      id: String(a.appointmentId),
      patientId: String(a.patient?.patientId || ''),
      doctorId: String(a.doctor?.doctorId || ''),
      patientName: name,
      patientCode: 'PT-' + String(a.patient?.patientId || 0).padStart(4, '0'),
      patientInitials: initials,
      avatarBg: bg,
      avatarColor: color,
      time: this.formatTime(a.appointmentTime),
      date: a.appointmentDate,
      type,
      reason: a.sessionUrl && !a.sessionUrl.startsWith('http') ? a.sessionUrl : '—', // TODO: backend has no reason field
      status,
      joinUrl: a.sessionUrl || undefined,
      raw: a
    };
  }

  private computeStats(todayAppts: BackendAppointment[]): AppointmentStats {
    const total = todayAppts.length;
    const video = todayAppts.filter(a => (a.appointmentType || '').toUpperCase() === 'VIDEO').length;
    const confirmed = todayAppts.filter(a => {
      const s = (a.status || '').toUpperCase();
      return s === 'CONFIRMED' || s === 'SCHEDULED';
    }).length;
    const pending = todayAppts.filter(a => (a.status || '').toUpperCase() === 'PENDING').length;
    const cancelled = todayAppts.filter(a =>
      (a.status || '').toUpperCase() === 'CANCELLED' || (a.status || '').toUpperCase() === 'CANCELED'
    ).length;
    return {
      todayTotal: total,
      videoCount: video,
      inPersonCount: total - video,
      confirmed,
      pending,
      cancelled,
      confirmRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    };
  }

  normalizeType(t: string): AppointmentType {
    return (t || '').toUpperCase() === 'VIDEO' ? 'Video' : 'In-person';
  }

  normalizeStatus(s: string): AppointmentStatus {
    const u = (s || '').toUpperCase();
    if (u === 'SCHEDULED') return 'Scheduled';
    if (u === 'CONFIRMED') return 'Confirmed';
    if (u === 'COMPLETED') return 'Completed';
    if (u === 'CANCELLED' || u === 'CANCELED') return 'Cancelled';
    return 'Pending';
  }

  formatTime(t: string): string {
    if (!t) return '';
    const parts = t.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }
}
