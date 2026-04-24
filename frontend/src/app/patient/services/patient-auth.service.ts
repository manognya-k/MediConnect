import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PatientStateService } from './patient-state.service';

const BASE = 'http://localhost:8081/api';
const STORAGE_KEY = 'mediconnect_patient_user';

export interface PatientLoginResponse {
  userId: number;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class PatientAuthService {
  constructor(
    private http: HttpClient,
    private state: PatientStateService
  ) {}

  login(email: string, password: string): Observable<PatientLoginResponse> {
    return this.http.post<PatientLoginResponse>(`${BASE}/auth/login`, { email, password }).pipe(
      map(res => {
        if (res.role !== 'PATIENT') {
          throw new Error('This account is not a patient account. Please use the doctor portal.');
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
        return res;
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state.clear();
  }

  isLoggedIn(): boolean {
    return !!this.getStoredUser();
  }

  getStoredUser(): PatientLoginResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
