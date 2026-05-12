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
      background: #F0F7FF; font-family: 'Inter', sans-serif;
    }
    .code  { font-size: 96px; font-weight: 800; color: #BBDEFB; line-height: 1; }
    .title { font-size: 1.75rem; font-weight: 700; color: #0D47A1; }
    .sub   { font-size: 0.9375rem; color: #78909C; }
    .btn {
      margin-top: 8px; padding: 12px 32px;
      font-family: 'Inter', sans-serif; font-size: 0.9375rem; font-weight: 600;
      background: #1565C0; color: white; border: none; border-radius: 8px; cursor: pointer;
      transition: filter 0.15s;
    }
    .btn:hover { filter: brightness(0.92); }
  `]
})
export class ForbiddenComponent {
  constructor(private router: Router) {}
  goBack() { this.router.navigate(['/login']); }
}
