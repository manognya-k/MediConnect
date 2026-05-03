import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminAppointmentsService } from '../../services/admin-appointments.service';

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-appointments.component.html',
  styleUrl: './admin-appointments.component.scss'
})
export class AdminAppointmentsComponent implements OnInit, OnDestroy {
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  stats: any = {};
  searchTerm = '';
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  private destroy$ = new Subject<void>();

  // Calendar days for Apr 2026 (hardcoded display data)
  calDays = Array.from({length: 30}, (_, i) => i + 1);

  constructor(private svc: AdminAppointmentsService) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ appointments, stats }) => {
        this.appointments = appointments;
        this.filteredAppointments = appointments.slice(0, 20);
        this.stats = stats;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredAppointments = this.appointments.filter(a =>
      a.patientName?.toLowerCase().includes(t) || a.doctorName?.toLowerCase().includes(t) || a.status?.toLowerCase().includes(t)
    ).slice(0, 20);
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = { 'CONFIRMED': 'b-green', 'PENDING': 'b-amber', 'CANCELLED': 'b-red', 'COMPLETED': 'b-teal' };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  getTypeBadge(type: string): string {
    return type?.toUpperCase() === 'VIDEO' ? 'b-blue' : 'b-sub';
  }

  get totalToday() { return this.stats.total || this.appointments.length; }
  get confirmed() { return this.stats.confirmed || 0; }
  get pending() { return this.stats.pending || 0; }
  get cancelled() { return this.stats.cancelled || 0; }
}
