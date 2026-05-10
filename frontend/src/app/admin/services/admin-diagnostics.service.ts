import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminDiagnosticsService {
  private base = environment.apiBase;
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
