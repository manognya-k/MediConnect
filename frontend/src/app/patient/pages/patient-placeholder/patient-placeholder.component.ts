import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <div class="ph-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#CBD5E0" stroke-width="1.5"/>
          <path d="M12 8v5M12 16v.5" stroke="#CBD5E0" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="ph-title">Coming Soon</div>
      <div class="ph-sub">This page is under construction.</div>
    </div>
  `,
  styles: [`
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 60px);
      gap: 12px;
      font-family: 'DM Sans', sans-serif;
    }
    .ph-title { font-size: 18px; font-weight: 600; color: #0D2B4E; }
    .ph-sub   { font-size: 14px; color: #8A94A6; }
  `]
})
export class PatientPlaceholderComponent {}
