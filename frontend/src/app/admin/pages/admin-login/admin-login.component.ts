import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { LogoComponent } from '../../../components/logo/logo.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
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
        next: () => {
          const adminId = this.adminAuth.getAdmin()?.id;
          if (!adminId) {
            this.isLoading = false;
            this.errorMsg  = 'Unable to resolve admin session.';
            return;
          }
          this.router.navigate(['/admin', adminId, 'overview'])
            .then(navigated => {
              if (!navigated) {
                this.isLoading = false;
                this.errorMsg  = 'Navigation blocked. Check console for errors.';
              }
            })
            .catch(err => {
              console.error('Admin navigation error:', err);
              this.isLoading = false;
              this.errorMsg  = 'Navigation error: ' + (err?.message ?? String(err));
            });
        },
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
