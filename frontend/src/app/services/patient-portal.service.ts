import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { BackendPatient } from '../models/patient.model';
import { BackendAppointment } from '../models/appointment.model';
import { BackendMedicalRecord } from '../models/medical-record.model';
import { BackendLabReport } from '../models/lab-report.model';

const BASE = 'http://localhost:8081/api';

// Extended appointment type that includes doctor user info as returned by API
export interface PortalAppointment extends BackendAppointment {
  doctor?: {
    doctorId: number;
    user?: { userId: number; name: string };
    specialization?: string;
    department?: { departmentId: number; departmentName: string } | undefined;
    hospital?: { hospitalId: number; hospitalName: string } | undefined;
  };
  hospital?: { hospitalId: number; hospitalName: string };
}

// Extended medical record that includes doctor user info
export interface PortalMedicalRecord extends BackendMedicalRecord {
  doctor?: {
    doctorId: number;
    user?: { name: string };
    specialization?: string;
  } | null;
  hospital?: { hospitalId: number; hospitalName: string } | null;
}

// Extended lab report that includes doctor user info
export interface PortalLabReport extends BackendLabReport {
  doctor?: {
    doctorId: number;
    user?: { name: string };
  } | null;
  hospital?: { hospitalId: number; hospitalName: string } | null;
}

@Injectable({ providedIn: 'root' })
export class PatientPortalService {
  constructor(private http: HttpClient) {}

  getAllPatients(): Observable<BackendPatient[]> {
    return this.http.get<BackendPatient[]>(`${BASE}/patients`).pipe(catchError(() => of([])));
  }

  getPatientAppointments(patientId: number): Observable<PortalAppointment[]> {
    return this.http.get<PortalAppointment[]>(`${BASE}/appointments/patient/${patientId}`).pipe(
      catchError(() => this.http.get<PortalAppointment[]>(`${BASE}/appointments`).pipe(
        catchError(() => of([]))
      ))
    );
  }

  getPatientMedicalRecords(patientId: number): Observable<PortalMedicalRecord[]> {
    return this.http.get<PortalMedicalRecord[]>(`${BASE}/medical-records/patient/${patientId}`).pipe(
      catchError(() => this.http.get<PortalMedicalRecord[]>(`${BASE}/medical-records`).pipe(
        catchError(() => of([]))
      ))
    );
  }

  getAllLabReports(): Observable<PortalLabReport[]> {
    return this.http.get<PortalLabReport[]>(`${BASE}/lab-reports`).pipe(catchError(() => of([])));
  }

  updatePatient(id: number, data: Partial<BackendPatient>): Observable<BackendPatient | null> {
    return this.http.put<BackendPatient>(`${BASE}/patients/${id}`, data).pipe(catchError(() => of(null)));
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

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  }

  todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getAge(dob: string | undefined): number {
    if (!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  normalizeType(t: string): string {
    return (t || '').toUpperCase() === 'VIDEO' ? 'Online' : 'In-Person';
  }

  normalizeStatus(s: string): string {
    const u = (s || '').toUpperCase();
    if (u === 'SCHEDULED') return 'Scheduled';
    if (u === 'CONFIRMED') return 'Confirmed';
    if (u === 'COMPLETED') return 'Completed';
    if (u === 'CANCELLED' || u === 'CANCELED') return 'Cancelled';
    return 'Pending';
  }

  normalizeLabResult(r: string | undefined): string {
    const v = (r || '').toUpperCase().trim();
    if (!v || v === 'PENDING') return 'Pending';
    if (v === 'ABNORMAL') return 'Abnormal';
    if (v === 'NORMAL') return 'Normal';
    return r || 'Pending';
  }
}
