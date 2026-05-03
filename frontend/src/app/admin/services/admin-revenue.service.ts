import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminRevenueService {
  private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  getAppointmentStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/appointment-stats`).pipe(
      catchError(() => of({}))
    );
  }
}
