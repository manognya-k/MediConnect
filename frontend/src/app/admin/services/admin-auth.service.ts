import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: AdminUser;
}

const ADMIN_TOKEN_KEY = 'mediconnect_admin_token';
const ADMIN_USER_KEY  = 'mediconnect_admin_user';

// Mock admin credentials — replace this method body with a real HTTP call
// once the backend endpoint POST /api/admin/auth/login is ready.
const MOCK_EMAIL    = 'admin@mediconnect.com';
const MOCK_PASSWORD = 'Admin@123';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {

  // HttpClient kept for future backend wiring
  constructor(private http: HttpClient) {}

  login(request: AdminLoginRequest): Observable<AdminLoginResponse> {
    // ── TODO: swap this block for the real HTTP call when backend is ready ──
    // return this.http.post<AdminLoginResponse>(
    //   'http://localhost:8081/api/admin/auth/login', request
    // ).pipe(tap(res => this.persist(res)));
    // ────────────────────────────────────────────────────────────────────────

    const email = request.email.trim().toLowerCase();
    const pass  = request.password;

    if (email === MOCK_EMAIL && pass === MOCK_PASSWORD) {
      const mock: AdminLoginResponse = {
        token: 'mock-admin-jwt-token',
        admin: { id: 1, name: 'Super Admin', email: MOCK_EMAIL, role: 'SUPER_ADMIN' }
      };
      this.persist(mock);
      return of(mock);
    }

    return throwError(() => new Error('Invalid email or password.'));
  }

  private persist(res: AdminLoginResponse): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(res.admin));
  }

  logout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  getAdmin(): AdminUser | null {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get adminInitials(): string {
    const admin = this.getAdmin();
    if (!admin) return 'SA';
    return admin.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  get adminName(): string {
    return this.getAdmin()?.name ?? 'Super Admin';
  }

  get adminRole(): string {
    return this.getAdmin()?.role ?? 'System Administrator';
  }
}
