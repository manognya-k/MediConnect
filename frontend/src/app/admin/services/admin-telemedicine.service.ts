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
    return this.http.get<any[]>(`${this.base}/admin/video-appointments`).pipe(
      catchError(() => of([]))
    );
  }
  getDoctorAvailability(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/doctor-availability`).pipe(catchError(() => of([])));
  }
  getData() {
    return forkJoin({ appointments: this.getVideoAppointments(), doctors: this.getDoctorAvailability() });
  }
  scheduleAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/appointments`, data);
  }

  getPatients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patients`).pipe(catchError(() => of([])));
  }

  getVideoSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/telemedicine/sessions`).pipe(catchError(() => of([])));
  }

  completeSession(appointmentId: number, durationMinutes?: number): Observable<any> {
    return this.http.post(`${this.base}/telemedicine/sessions/complete`,
      { appointmentId, durationMinutes });
  }
}
