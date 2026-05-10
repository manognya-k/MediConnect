import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/stats`).pipe(catchError(() => of({})));
  }

  getBedOccupancy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/bed-occupancy`).pipe(catchError(() => of([])));
  }

  getAppointmentStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/appointment-stats`).pipe(catchError(() => of({})));
  }

  getHospitals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/hospitals`).pipe(catchError(() => of([])));
  }

  /** Returns monthly flow, department completion rates, heatmap, and cancellation trend. */
  getAnalytics(filters?: { hospitalId?: number; department?: string; rangeDays?: number }): Observable<any> {
    let params: Record<string, string> = {};
    if (filters?.hospitalId)  params['hospitalId']  = String(filters.hospitalId);
    if (filters?.department)  params['department']  = filters.department;
    if (filters?.rangeDays)   params['rangeDays']   = String(filters.rangeDays);
    return this.http.get<any>(`${this.base}/admin/analytics`, { params }).pipe(catchError(() => of({})));
  }

  getAllData(filters?: { hospitalId?: number; department?: string; rangeDays?: number }) {
    return forkJoin({
      stats:        this.getStats(),
      bedOccupancy: this.getBedOccupancy(),
      apptStats:    this.getAppointmentStats(),
      hospitals:    this.getHospitals(),
      analytics:    this.getAnalytics(filters)
    });
  }
}
