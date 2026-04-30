import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError } from 'rxjs';
import { BackendPatient, Patient, PatientStats, PatientFilter, mapBackendPatient } from '../models/patient.model';

const BASE = 'http://localhost:8081/api';

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

        if (filter.patientIds && filter.patientIds.length > 0) {
          const ids = new Set(filter.patientIds);
          filtered = filtered.filter(p => ids.has(p.rawId));
        }

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

  getPatientsByHospital(hospitalId: number): Observable<Patient[]> {
    return this.http.get<BackendPatient[]>(`${BASE}/patients/hospital/${hospitalId}`).pipe(
      map(list => list.map((p, i) => mapBackendPatient(p, i))),
      catchError(() => of([]))
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
}
