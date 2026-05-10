import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div class="forbidden">
      <app-logo></app-logo>
      <div class="code">403</div>
      <div class="title">Access Denied</div>
      <div class="sub">You do not have permission to view this page.</div>
      <button class="btn" (click)="goBack()">Go Back</button>
    </div>
  `,
  styles: [`
    .forbidden {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .code  { font-size: 96px; font-weight: 800; color: #E2E8F0; line-height: 1; }
    .title { font-size: 28px; font-weight: 700; color: #0F172A; }
    .sub   { font-size: 15px; color: #64748B; }
    .btn {
      margin-top: 8px; padding: 12px 32px; font-size: 14px; font-weight: 600;
      background: linear-gradient(135deg, #0AAFB8, #1A5FA8);
      color: white; border: none; border-radius: 8px; cursor: pointer;
    }
    .btn:hover { opacity: 0.9; }
  `]
})
export class ForbiddenComponent {
  constructor(private router: Router) {}
  goBack() { this.router.navigate(['/login']); }
}
