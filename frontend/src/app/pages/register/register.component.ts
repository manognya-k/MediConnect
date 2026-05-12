import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  activeTab: 'PATIENT' | 'DOCTOR' = 'PATIENT';

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  dateOfBirth = '';
  bloodGroup = '';
  gender = '';
  specialization = '';
  hospitalId = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  agreeTerms = false;
  loading = false;
  errorMessage = '';

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  specializations = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology',
    'Gastroenterology', 'Oncology', 'Psychiatry', 'Radiology', 'Endocrinology',
    'Nephrology', 'Pulmonology', 'Rheumatology', 'Urology', 'Ophthalmology',
    'Otolaryngology', 'Hematology', 'Infectious Disease', 'General Surgery', 'General Medicine'
  ];

  hospitals: any[] = [];
  hospitalsLoading = false;
  hospitalsError = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  setTab(tab: 'PATIENT' | 'DOCTOR') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.resetForm();
    if (tab === 'DOCTOR' && this.hospitals.length === 0) {
      this.loadHospitals();
    }
  }

  loadHospitals() {
    this.hospitalsLoading = true;
    this.hospitalsError = false;
    this.http.get<any[]>(`${environment.apiBase}/hospitals`).subscribe({
      next: (data) => { this.hospitals = data; this.hospitalsLoading = false; },
      error: () => { this.hospitalsError = true; this.hospitalsLoading = false; }
    });
  }

  resetForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phone = '';
    this.dateOfBirth = '';
    this.bloodGroup = '';
    this.gender = '';
    this.specialization = '';
    this.hospitalId = '';
    this.password = '';
    this.confirmPassword = '';
    this.agreeTerms = false;
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  onRegister() {
    this.errorMessage = '';

    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    if (this.activeTab === 'DOCTOR' && !this.specialization) {
      this.errorMessage = 'Please select a specialization.';
      return;
    }
    if (this.activeTab === 'DOCTOR' && !this.hospitalId) {
      this.errorMessage = 'Please select a hospital.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (!this.agreeTerms) {
      this.errorMessage = 'Please agree to the Terms of Service.';
      return;
    }

    this.loading = true;

    const request: any = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      phone: this.phone,
      role: this.activeTab,
      dateOfBirth: this.dateOfBirth || undefined,
      bloodGroup: this.bloodGroup || undefined,
      gender: this.gender || undefined,
    };

    if (this.activeTab === 'DOCTOR') {
      request.specialization = this.specialization;
      request.hospitalId = +this.hospitalId;
    }

    this.authService.register(request).subscribe({
      next: (response) => {
        this.authService.saveUser(response);
        this.loading = false;
        if (response.role === 'PATIENT') {
          this.router.navigate(['/patient', response.userId, 'dashboard']);
        } else {
          this.router.navigate(['/doctor', response.userId, 'dashboard']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
