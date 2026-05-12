import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { AdminAuthService, AdminRegisterRequest } from '../../services/admin-auth.service';
import { environment } from '../../../../environments/environment';
import { LogoComponent } from '../../../components/logo/logo.component';

interface HospitalOption {
  hospitalId: number;
  hospitalName: string;
  emailCode: string;
}

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss'
})
export class AdminRegisterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  hospitals: HospitalOption[] = [];
  hospitalsLoading = true;

  selectedHospitalId: number | null = null;
  firstName   = '';
  lastName    = '';
  email       = '';
  phone       = '';
  password    = '';
  confirmPw   = '';
  agreeTerms  = false;

  showPw        = false;
  showConfirmPw = false;
  isLoading     = false;
  errorMsg      = '';
  successMsg    = '';

  constructor(
    private adminAuth: AdminAuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.http.get<HospitalOption[]>(`${environment.apiBase}/hospitals`).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe(hospitals => {
      this.hospitals = hospitals;
      this.hospitalsLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedHospital(): HospitalOption | null {
    return this.hospitals.find(h => h.hospitalId === this.selectedHospitalId) ?? null;
  }

  get emailPlaceholder(): string {
    const code = this.selectedHospital?.emailCode?.toLowerCase();
    return code ? `admin@${code}.com` : 'Select a hospital first';
  }

  get emailHint(): string {
    const code = this.selectedHospital?.emailCode?.toLowerCase();
    return code ? `Must end with @${code}.com` : '';
  }

  validateEmail(): boolean {
    if (!this.selectedHospital?.emailCode) return true;
    const required = `@${this.selectedHospital.emailCode.toLowerCase()}.com`;
    return this.email.toLowerCase().endsWith(required);
  }

  submit(): void {
    this.errorMsg   = '';
    this.successMsg = '';

    if (!this.selectedHospitalId) { this.errorMsg = 'Please select a hospital.'; return; }
    if (!this.firstName.trim())   { this.errorMsg = 'First name is required.'; return; }
    if (!this.lastName.trim())    { this.errorMsg = 'Last name is required.'; return; }
    if (!this.email.trim())       { this.errorMsg = 'Email address is required.'; return; }
    if (!this.validateEmail())    {
      const code = this.selectedHospital?.emailCode?.toLowerCase();
      this.errorMsg = `Email must use hospital domain @${code}.com`;
      return;
    }
    if (!this.phone.trim())       { this.errorMsg = 'Phone number is required.'; return; }
    if (this.password.length < 6) { this.errorMsg = 'Password must be at least 6 characters.'; return; }
    if (this.password !== this.confirmPw) { this.errorMsg = 'Passwords do not match.'; return; }
    if (!this.agreeTerms)         { this.errorMsg = 'You must agree to the terms.'; return; }

    this.isLoading = true;
    const payload: AdminRegisterRequest = {
      firstName:  this.firstName.trim(),
      lastName:   this.lastName.trim(),
      email:      this.email.trim().toLowerCase(),
      phone:      this.phone.trim(),
      password:   this.password,
      hospitalId: this.selectedHospitalId
    };

    this.adminAuth.register(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isLoading  = false;
        this.successMsg = 'Account created successfully! Redirecting…';
        setTimeout(() => {
          const adminId = res.admin?.id;
          if (adminId) this.router.navigate(['/admin', adminId, 'overview']);
          else this.router.navigate(['/admin/login']);
        }, 1200);
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.errorMsg  = err.message || 'Registration failed. Please try again.';
      }
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.submit();
  }
}
