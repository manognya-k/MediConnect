import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private base = 'http://localhost:8081/api';
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
  getAllData() {
    return forkJoin({
      stats: this.getStats(),
      bedOccupancy: this.getBedOccupancy(),
      apptStats: this.getAppointmentStats()
    });
  }
}
