import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  activeTab: 'PATIENT' | 'DOCTOR' | 'ADMIN' = 'PATIENT';
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  setTab(tab: 'PATIENT' | 'DOCTOR' | 'ADMIN') {
    this.activeTab = tab;
    this.errorMessage = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        if (response.role !== this.activeTab) {
          this.errorMessage = `This account is not a ${this.activeTab.toLowerCase()} account.`;
          this.loading = false;
          return;
        }
        this.authService.saveUser(response);
        this.loading = false;
        if (response.role === 'PATIENT') {
          this.router.navigate(['/patient/dashboard']);
        } else if (response.role === 'DOCTOR') {
          this.router.navigate(['/doctor/dashboard']);
        } else {
          this.router.navigate(['/admin/dashboard']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error || 'Login failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
