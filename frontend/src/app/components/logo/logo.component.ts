import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-wrap">
      <img src="assets/logo.svg" alt="MediConnect Logo" class="logo-img" />
      <span class="logo-text" [class.light]="light">MediConnect</span>
    </div>
  `,
  styles: [`
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .logo-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .logo-text {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #0D47A1;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }
    .logo-text.light {
      color: #ffffff;
    }
  `]
})
export class LogoComponent {
  @Input() light = false;
}
