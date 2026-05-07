import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminHospitalsService {
  private base = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  getHospitals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/hospitals`).pipe(
      catchError(() => of([]))
    );
  }

  getBedOccupancy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/bed-occupancy`).pipe(
      catchError(() => of([]))
    );
  }

  updateHospital(id: number, body: any): Observable<any> {
    return this.http.put(`${this.base}/hospitals/${id}`, body);
  }

  createHospital(body: any): Observable<any> {
    return this.http.post(`${this.base}/hospitals`, body);
  }
}
