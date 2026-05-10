import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { ToastComponent } from '../../components/toast/toast.component';
import { WebSocketService } from '../../services/websocket.service';
import { DashboardService } from '../../services/dashboard.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule, ToastComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrl: './doctor-layout.component.scss'
})
export class DoctorLayoutComponent implements OnInit, OnDestroy {
  doctorName = 'Doctor';
  doctorRole = 'Doctor';
  initials = 'DC';
  doctorId: number | null = null;
  internalDoctorId: number | null = null;

  currentStatus = 'AVAILABLE';
  statusUpdating = false;

  readonly statusOptions = [
    { value: 'AVAILABLE',   label: 'Available',   color: '#10B981' },
    { value: 'BUSY',        label: 'Busy',         color: '#F59E0B' },
    { value: 'OFFLINE',     label: 'Offline',      color: '#94A3B8' },
  ];

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private router: Router,
    private ws: WebSocketService,
    private dashSvc: DashboardService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user) {
      this.doctorId   = user.userId;
      this.doctorName = user.name || 'Doctor';
      this.doctorRole = 'Doctor';
      const parts = (user.name || '').split(' ');
      this.initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'DC';
      if (user.token) this.ws.connect(user.userId, user.token);

      // Resolve internal doctorId and load current status
      this.dashSvc.getAllDoctors().subscribe(docs => {
        const doc = docs.find(d => d.user?.userId === user.userId);
        if (doc) {
          this.internalDoctorId = doc.doctorId;
          this.currentStatus = doc.availabilityStatus || 'AVAILABLE';
        }
      });
    }
  }

  ngOnDestroy() { this.ws.disconnect(); }

  linkTo(path: string): (string | number)[] {
    return this.doctorId ? ['/doctor', this.doctorId, path] : ['/login'];
  }

  getStatusColor(): string {
    return this.statusOptions.find(s => s.value === this.currentStatus)?.color ?? '#94A3B8';
  }

  onStatusChange(): void {
    if (!this.internalDoctorId || this.statusUpdating) return;
    this.statusUpdating = true;
    this.http.patch(`${environment.apiBase}/doctors/${this.internalDoctorId}/status`,
      { status: this.currentStatus }).subscribe({
      next: () => { this.statusUpdating = false; },
      error: () => { this.statusUpdating = false; }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
