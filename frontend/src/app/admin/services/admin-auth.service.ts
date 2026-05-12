import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  hospitalId: number;
}

export interface AdminUser {
  id: number;
  uniqueId?: string;
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

@Injectable({ providedIn: 'root' })
export class AdminAuthService {

  constructor(private http: HttpClient, private router: Router) {}

  register(request: AdminRegisterRequest): Observable<AdminLoginResponse> {
    return this.http.post<any>(`${environment.apiBase}/admin/register`, request).pipe(
      map(res => {
        const loginRes: AdminLoginResponse = {
          token: res.token,
          admin: { id: res.userId, uniqueId: res.uniqueId, name: res.name, email: res.email, role: res.role }
        };
        return loginRes;
      }),
      catchError(err => {
        const msg = typeof err.error === 'string' && err.error
          ? err.error
          : err.error?.message ?? 'Registration failed. Please try again.';
        return throwError(() => new Error(msg));
      })
    );
  }

  login(request: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http.post<any>(`${environment.apiBase}/admin/login`, request).pipe(
      map(res => {
        const loginRes: AdminLoginResponse = {
          token: res.token,
          admin: { id: res.userId, uniqueId: res.uniqueId, name: res.name, email: res.email, role: res.role }
        };
        this.persist(loginRes);
        return loginRes;
      }),
      catchError(err => {
        const msg = typeof err.error === 'string' && err.error
          ? err.error
          : err.error?.message ?? 'Invalid email or password.';
        return throwError(() => new Error(msg));
      })
    );
  }

  private persist(res: AdminLoginResponse): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(res.admin));
  }

  logout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  getAdmin(): AdminUser | null {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    const admin = this.getAdmin();
    return !!this.getToken() && !!admin && admin.role === 'ADMIN';
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
