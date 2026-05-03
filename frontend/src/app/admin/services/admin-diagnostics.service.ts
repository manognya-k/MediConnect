import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminDiagnosticsService {
  private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  getLabReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/lab-reports`).pipe(catchError(() => of([])));
  }

  getLabStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/lab-stats`).pipe(catchError(() => of({})));
  }

  getAllData() {
    return forkJoin({ reports: this.getLabReports(), stats: this.getLabStats() });
  }
}
