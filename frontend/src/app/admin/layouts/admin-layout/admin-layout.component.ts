import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  adminName     = '';
  adminRole     = '';
  adminInitials = '';

  constructor(
    private adminAuth:    AdminAuthService,
    private router:       Router,
    public  notifSvc:     AdminNotificationService
  ) {}

  ngOnInit() {
    this.adminName     = this.adminAuth.adminName;
    this.adminInitials = this.adminAuth.adminInitials;
    this.adminRole     = this.formatRole(this.adminAuth.adminRole);
  }

  private formatRole(role: string): string {
    return role.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  logout(): void {
    this.adminAuth.logout();
  }

  get today(): string {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}
