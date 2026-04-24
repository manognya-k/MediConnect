import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { PatientStateService } from './patient-state.service';

export type PatientLoginResponse = AuthResponse;

@Injectable({ providedIn: 'root' })
export class PatientAuthService {
  constructor(
    private auth: AuthService,
    private state: PatientStateService,
    private router: Router
  ) {}

  logout(): void {
    this.auth.logout();
    this.state.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const user = this.auth.getUser();
    return !!user && user.role === 'PATIENT';
  }

  getStoredUser(): PatientLoginResponse | null {
    const user = this.auth.getUser();
    return user?.role === 'PATIENT' ? user : null;
  }
}
