import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminTelemedicineService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  getVideoAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/appointments`).pipe(
      catchError(() => of([]))
    );
  }
  getDoctorAvailability(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/doctors`).pipe(catchError(() => of([])));
  }
  getData() {
    return forkJoin({ appointments: this.getVideoAppointments(), doctors: this.getDoctorAvailability() });
  }
  scheduleAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/appointments`, data);
  }
}
