import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService, Hospital, Department } from '../../services/admin.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  activeTab: 'PATIENT' | 'DOCTOR' | 'ADMIN' = 'PATIENT';

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  dateOfBirth = '';
  bloodGroup = '';
  gender = '';
  specialization = '';
  hospitalId = '';
  departmentId = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  agreeTerms = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  hospitals: Hospital[] = [];
  departments: Department[] = [];

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminService.getHospitals().subscribe({
      next: (h) => { this.hospitals = h; }
    });
  }

  setTab(tab: 'PATIENT' | 'DOCTOR' | 'ADMIN') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.resetForm();
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
    this.departmentId = '';
    this.departments = [];
    this.password = '';
    this.confirmPassword = '';
    this.agreeTerms = false;
  }

  onHospitalChange(): void {
    this.departmentId = '';
    this.departments = [];
    if (this.hospitalId) {
      this.adminService.getDepartmentsByHospital(Number(this.hospitalId)).subscribe({
        next: (d) => { this.departments = d; }
      });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onRegister() {
    this.errorMessage = '';

    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all required fields.';
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
    if (this.activeTab === 'DOCTOR' && !this.hospitalId) {
      this.errorMessage = 'Please select a hospital.';
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
      specialization: this.specialization || undefined
    };

    if (this.activeTab === 'DOCTOR') {
      request.hospitalId = Number(this.hospitalId);
      request.departmentId = this.departmentId ? Number(this.departmentId) : undefined;
      request.availabilityStatus = 'AVAILABLE';
    }

    this.authService.register(request).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
