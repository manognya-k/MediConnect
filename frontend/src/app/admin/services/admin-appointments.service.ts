import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminAppointmentsService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  getAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/appointments`).pipe(catchError(() => of([])));
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/appointment-stats`).pipe(catchError(() => of({})));
  }

  getAllData() {
    return forkJoin({ appointments: this.getAppointments(), stats: this.getStats() });
  }

  approve(id: number, original: any): Observable<any> {
    const body = { ...original, status: 'CONFIRMED' };
    return this.http.put(`${this.base}/appointments/${id}`, body);
  }

  create(body: any): Observable<any> {
    return this.http.post(`${this.base}/appointments`, body);
  }

  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/doctors`).pipe(catchError(() => of([])));
  }

  getHospitals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/hospitals`).pipe(catchError(() => of([])));
  }

  getPatients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patients`).pipe(catchError(() => of([])));
  }

  // ── Reschedule requests ───────────────────────────────────────────────────────

  getRescheduleRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reschedule/admin/all`).pipe(catchError(() => of([])));
  }

  forwardReschedule(id: number, adminNotes = ''): Observable<any> {
    return this.http.put(`${this.base}/reschedule/admin/forward/${id}`, { adminNotes });
  }

  rejectReschedule(id: number, adminNotes = ''): Observable<any> {
    return this.http.put(`${this.base}/reschedule/admin/reject/${id}`, { adminNotes });
  }
}
