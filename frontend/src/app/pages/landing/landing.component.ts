import { Component, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  isScrolled = false;
  mobileNavOpen = false;

  constructor(private router: Router) {}

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  goToLogin()  { this.router.navigate(['/login']); }
  goToAdmin()  { this.router.navigate(['/admin/login']); }
}
