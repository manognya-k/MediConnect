import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminRevenueService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  getAppointmentStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/appointment-stats`).pipe(catchError(() => of({})));
  }

  getAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/appointments`).pipe(catchError(() => of([])));
  }

  getBills(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/bills`).pipe(catchError(() => of([])));
  }

  getAllData() {
    return forkJoin({
      stats: this.getAppointmentStats(),
      appointments: this.getAppointments(),
      bills: this.getBills()
    });
  }

  processOverdueBills(): Observable<{ overdueCount: number; bills: any[] }> {
    return this.http
      .post<{ overdueCount: number; bills: any[] }>(`${this.base}/admin/bills/process-overdue`, {})
      .pipe(catchError(() => of({ overdueCount: 0, bills: [] })));
  }

  updateBillStatus(billId: number, status: string): Observable<{ id: number; status: string }> {
    return this.http.patch<{ id: number; status: string }>(
      `${this.base}/admin/bills/${billId}/status`,
      { status }
    );
  }
}
