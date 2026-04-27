import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminAppointment, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-appointments.component.html',
  styleUrls: ['./admin-appointments.component.scss']
})
export class AdminAppointmentsComponent implements OnInit {
  allAppointments: AdminAppointment[] = [];
  filtered: AdminAppointment[] = [];
  hospitals: Hospital[] = [];

  hospitalFilter = '';
  statusFilter = '';
  typeFilter = '';
  dateFilter = '';
  searchQuery = '';

  loading = true;
  error = '';

  page = 1;
  pageSize = 10;

  totalToday = 0;
  scheduled = 0;
  completed = 0;
  cancelled = 0;

  constructor(public layout: LayoutService, public admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.admin.getHospitals(),
      appointments: this.admin.getAppointments()
    }).subscribe({
      next: ({ hospitals, appointments }) => {
        this.hospitals = hospitals;
        this.allAppointments = appointments;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load appointment data.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    let result = [...this.allAppointments];

    if (this.hospitalFilter) {
      result = result.filter(a => a.hospital?.hospitalId === Number(this.hospitalFilter));
    }
    if (this.statusFilter) {
      result = result.filter(a => a.status?.toUpperCase() === this.statusFilter);
    }
    if (this.typeFilter) {
      result = result.filter(a => a.appointmentType?.toUpperCase() === this.typeFilter);
    }
    if (this.dateFilter) {
      result = result.filter(a => a.appointmentDate === this.dateFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(a =>
        this.getPatientName(a).toLowerCase().includes(q) ||
        this.getDoctorName(a).toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    result.sort((a, b) => {
      const dateA = a.appointmentDate || '';
      const dateB = b.appointmentDate || '';
      return dateB.localeCompare(dateA);
    });

    this.filtered = result;
    this.computeStats();
    this.page = 1;
  }

  onSearch(): void {
    this.page = 1;
    this.applyFilter();
  }

  private computeStats(): void {
    const today = this.admin.todayISO();
    this.totalToday = this.filtered.filter(a => a.appointmentDate === today).length;
    this.scheduled = this.filtered.filter(a => {
      const s = a.status?.toUpperCase();
      return s === 'SCHEDULED' || s === 'CONFIRMED';
    }).length;
    this.completed = this.filtered.filter(a => a.status?.toUpperCase() === 'COMPLETED').length;
    this.cancelled = this.filtered.filter(a => a.status?.toUpperCase() === 'CANCELLED').length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AdminAppointment[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(total, this.page + 2); i++) {
      pages.push(i);
    }
    if (!pages.includes(1)) pages.unshift(1);
    if (!pages.includes(total)) pages.push(total);
    return pages;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  getStatusClass(s: string): string {
    switch (s?.toUpperCase()) {
      case 'SCHEDULED':
      case 'CONFIRMED': return 'badge-scheduled';
      case 'COMPLETED': return 'badge-completed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-default';
    }
  }

  getTypeClass(t: string): string {
    return t?.toUpperCase() === 'VIDEO' ? 'badge-video' : 'badge-inperson';
  }

  getTypeLabel(t: string): string {
    return t?.toUpperCase() === 'VIDEO' ? 'Video' : 'In-Person';
  }

  getPatientName(a: AdminAppointment): string {
    return a.patient?.user?.name || '—';
  }

  getDoctorName(a: AdminAppointment): string {
    return a.doctor?.user?.name ? `Dr. ${a.doctor.user.name}` : '—';
  }

  getHospitalName(a: AdminAppointment): string {
    return a.hospital?.hospitalName || '—';
  }
}
