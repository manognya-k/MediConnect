import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminTelemedicineService {
  private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  getVideoAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/video-appointments`).pipe(catchError(() => of([])));
  }
  getDoctorAvailability(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/doctor-availability`).pipe(catchError(() => of([])));
  }
  getData() {
    return forkJoin({ appointments: this.getVideoAppointments(), doctors: this.getDoctorAvailability() });
  }
}
