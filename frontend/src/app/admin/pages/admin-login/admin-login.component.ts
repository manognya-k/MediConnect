import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  email      = '';
  password   = '';
  isLoading  = false;
  errorMsg   = '';
  showPw     = false;

  constructor(
    private adminAuth: AdminAuthService,
    private router:    Router
  ) {}

  submit(): void {
    if (this.isLoading) return;
    this.errorMsg = '';

    if (!this.email.trim() || !this.password) {
      this.errorMsg = 'Please enter your email and password.';
      return;
    }

    this.isLoading = true;
    this.adminAuth.login({ email: this.email.trim(), password: this.password })
      .subscribe({
        next: () => this.router.navigate(['/admin/overview']),
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMsg  = err.message || 'Login failed. Please try again.';
        }
      });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.submit();
  }
}
