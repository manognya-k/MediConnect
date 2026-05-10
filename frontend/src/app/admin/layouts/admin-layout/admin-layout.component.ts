import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminNotificationService } from '../../services/admin-notification.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  adminName     = '';
  adminRole     = '';
  adminInitials = '';
  adminId: number | null = null;

  constructor(
    private adminAuth:    AdminAuthService,
    private router:       Router,
    public  notifSvc:     AdminNotificationService,
    private ws:           WebSocketService
  ) {}

  ngOnInit() {
    this.adminId       = this.adminAuth.getAdmin()?.id ?? null;
    this.adminName     = this.adminAuth.adminName;
    this.adminInitials = this.adminAuth.adminInitials;
    this.adminRole     = this.formatRole(this.adminAuth.adminRole);
    const token = this.adminAuth.getToken();
    if (this.adminId && token) this.ws.connect(this.adminId, token);
  }

  ngOnDestroy() { this.ws.disconnect(); }

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

  nav(path: string): (string | number)[] {
    return this.adminId ? ['/admin', this.adminId, path] : ['/admin/login'];
  }
}
