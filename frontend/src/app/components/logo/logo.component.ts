import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-wrap">
      <div class="logo-icon">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="logo-text">MediConnect</span>
    </div>
  `,
  styles: [`
    .logo-wrap { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .logo-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #0AAFB8, #1A5FA8);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .logo-text { font-size: 18px; font-weight: 700; color: #1A202C; letter-spacing: -0.3px; }
  `]
})
export class LogoComponent {}
