import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, forkJoin } from 'rxjs';
import { BackendPatient, Patient, PatientStats, PatientFilter, mapBackendPatient } from '../models/patient.model';
import { environment } from '../../environments/environment';

const BASE = environment.apiBase;

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  constructor(private http: HttpClient) {}

  private _allPatients: Patient[] = [];
  private _loaded = false;

  private fetchAll(): Observable<Patient[]> {
    return this.http.get<BackendPatient[]>(`${BASE}/patients`).pipe(
      map(list => list.map((p, i) => mapBackendPatient(p, i)))
    );
  }

  getPatients(filter: PatientFilter): Observable<PagedResult<Patient>> {
    return this.fetchAll().pipe(
      map(all => {
        this._allPatients = all;
        this._loaded = true;
        let filtered = all;

        if (filter.search) {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter(p =>
            p.fullName.toLowerCase().includes(q) ||
            p.patientCode.toLowerCase().includes(q) ||
            p.diagnosis.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
          );
        }
        if (filter.gender) {
          filtered = filtered.filter(p =>
            p.gender.toLowerCase() === filter.gender.toLowerCase()
          );
        }
        if (filter.bloodGroup) {
          filtered = filtered.filter(p => p.bloodGroup === filter.bloodGroup);
        }
        if (filter.status) {
          filtered = filtered.filter(p =>
            p.status.toLowerCase() === filter.status.toLowerCase()
          );
        }

        const total = filtered.length;
        const start = (filter.page - 1) * filter.pageSize;
        const data = filtered.slice(start, start + filter.pageSize);

        return { data, total, page: filter.page, pageSize: filter.pageSize };
      }),
      catchError(err => throwError(() => err))
    );
  }

  getPatientById(id: string): Observable<Patient> {
    return this.http.get<BackendPatient>(`${BASE}/patients/${id}`).pipe(
      map((p) => mapBackendPatient(p, 0)),
      catchError(err => throwError(() => err))
    );
  }

  getStats(all: Patient[]): PatientStats {
    const total = all.length;
    // TODO: backend has no stats endpoint — computed client-side
    const criticalCases = all.filter(p => p.status === 'Critical').length;
    const activeThisWeek = all.filter(p => p.status === 'Active').length;
    return {
      total,
      activeThisWeek,
      criticalCases,
      newThisMonth: Math.round(total * 0.022), // TODO: wire to real data
      totalToday: Math.min(48, Math.round(total * 0.017)),
      increasePercent: 12.5,
    };
  }

  createPatient(data: {
    firstName: string; lastName: string; email: string; password: string;
    phone: string; dateOfBirth?: string; bloodGroup?: string; gender?: string;
  }): Observable<any> {
    // Backend creates both User+Patient via register endpoint when role=PATIENT
    return this.http.post(`${BASE}/auth/register`, { ...data, role: 'PATIENT' }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  updatePatient(id: string, data: Partial<BackendPatient>): Observable<BackendPatient> {
    return this.http.put<BackendPatient>(`${BASE}/patients/${id}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/patients/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getPatientAppointments(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/appointments/patient/${patientId}`).pipe(
      catchError(() => of([]))
    );
  }

  /** Returns only patients linked to this doctor via appointments or medical records. */
  getDoctorPatients(doctorId: number, filter: PatientFilter): Observable<PagedResult<Patient>> {
    return forkJoin({
      patients:     this.http.get<BackendPatient[]>(`${BASE}/doctors/${doctorId}/patients`),
      appointments: this.http.get<any[]>(`${BASE}/appointments/doctor/${doctorId}`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ patients, appointments }) => {
        // Build map: patientId → most recent past appointment date
        const lastVisitMap = new Map<number, string>();
        for (const appt of appointments) {
          const pid  = appt.patient?.patientId as number | undefined;
          const date = appt.appointmentDate as string | undefined;
          if (pid && date) {
            const existing = lastVisitMap.get(pid);
            if (!existing || date > existing) lastVisitMap.set(pid, date);
          }
        }

        let all = patients.map((p, i) => {
          const mapped = mapBackendPatient(p, i);
          mapped.lastVisit = lastVisitMap.get(p.patientId) ?? '';
          return mapped;
        });

        if (filter.search) {
          const q = filter.search.toLowerCase();
          all = all.filter(p =>
            p.fullName.toLowerCase().includes(q) ||
            p.patientCode.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
          );
        }
        if (filter.gender)     all = all.filter(p => p.gender.toLowerCase() === filter.gender.toLowerCase());
        if (filter.bloodGroup) all = all.filter(p => p.bloodGroup === filter.bloodGroup);
        if (filter.status)     all = all.filter(p => p.status.toLowerCase() === filter.status.toLowerCase());

        const total = all.length;
        const start = (filter.page - 1) * filter.pageSize;
        return { data: all.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize };
      }),
      catchError(err => throwError(() => err))
    );
  }
}
