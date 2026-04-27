import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { PatientPortalService, PortalAppointment } from '../../services/patient-portal.service';
import { BackendPatient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-appointments.component.html',
  styleUrl: './patient-appointments.component.scss'
})
export class PatientAppointmentsComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  patientInfo: BackendPatient | null = null;

  allAppointments: PortalAppointment[] = [];
  filtered: PortalAppointment[] = [];
  paged: PortalAppointment[] = [];

  loading = true;
  error = '';

  searchQuery = '';
  statusFilter = '';
  typeFilter = '';
  tabFilter: 'all' | 'upcoming' | 'past' = 'all';

  page = 1;
  pageSize = 8;
  totalPages = 1;

  upcomingCount = 0;
  completedCount = 0;
  cancelledCount = 0;
  onlineCount = 0;

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private portalService: PatientPortalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    if (!this.currentUser) { this.router.navigate(['/login']); return; }
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    this.portalService.getAllPatients().subscribe({
      next: (patients) => {
        this.patientInfo = patients.find(p => p.user?.userId === this.currentUser?.userId) || null;
        const pid = this.patientInfo?.patientId;
        if (pid) {
          this.portalService.getPatientAppointments(pid).subscribe({
            next: (appts) => { this.allAppointments = appts; this.computeStats(); this.applyFilter(); this.loading = false; },
            error: () => { this.error = 'Failed to load appointments'; this.loading = false; }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => { this.error = 'Failed to load patient info'; this.loading = false; }
    });
  }

  private computeStats() {
    const today = this.portalService.todayISO();
    this.upcomingCount = this.allAppointments.filter(a =>
      a.appointmentDate >= today && (a.status || '').toUpperCase() !== 'CANCELLED'
    ).length;
    this.completedCount = this.allAppointments.filter(a =>
      (a.status || '').toUpperCase() === 'COMPLETED'
    ).length;
    this.cancelledCount = this.allAppointments.filter(a =>
      (a.status || '').toUpperCase() === 'CANCELLED' || (a.status || '').toUpperCase() === 'CANCELED'
    ).length;
    this.onlineCount = this.allAppointments.filter(a =>
      (a.appointmentType || '').toUpperCase() === 'VIDEO'
    ).length;
  }

  applyFilter() {
    const today = this.portalService.todayISO();
    let result = [...this.allAppointments];

    if (this.tabFilter === 'upcoming') result = result.filter(a => a.appointmentDate >= today);
    else if (this.tabFilter === 'past') result = result.filter(a => a.appointmentDate < today);

    if (this.statusFilter) {
      const s = this.statusFilter.toUpperCase();
      result = result.filter(a => (a.status || '').toUpperCase() === s);
    }

    if (this.typeFilter) {
      const t = this.typeFilter.toUpperCase();
      result = result.filter(a => {
        const at = (a.appointmentType || '').toUpperCase();
        if (t === 'ONLINE') return at === 'VIDEO';
        if (t === 'IN_PERSON') return at === 'IN_PERSON' || at === 'IN-PERSON';
        return true;
      });
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.doctor?.user?.name || '').toLowerCase().includes(q) ||
        (a.hospital?.hospitalName || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dc = a.appointmentDate.localeCompare(b.appointmentDate);
      return this.tabFilter === 'past' ? -dc : dc;
    });

    this.filtered = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.updatePage();
  }

  updatePage() {
    const start = (this.page - 1) * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  setTab(tab: 'all' | 'upcoming' | 'past') { this.tabFilter = tab; this.page = 1; this.applyFilter(); }
  onSearch() { this.page = 1; this.applyFilter(); }
  onFilterChange() { this.page = 1; this.applyFilter(); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.page = p; this.updatePage(); } }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages.slice(Math.max(0, this.page - 3), this.page + 2);
  }

  getDoctorName(a: PortalAppointment) { return a.doctor?.user?.name || '—'; }
  getDoctorSpec(a: PortalAppointment) { return a.doctor?.department?.departmentName || a.doctor?.specialization || ''; }
  getHospital(a: PortalAppointment) { return a.hospital?.hospitalName || '—'; }
  formatDate(d: string) { return this.portalService.formatDate(d); }
  formatTime(t: string) { return this.portalService.formatTime(t); }

  getTypeLabel(t: string) { return this.portalService.normalizeType(t); }
  getTypeClass(t: string) { return (t || '').toUpperCase() === 'VIDEO' ? 'badge-online' : 'badge-inperson'; }

  getStatusLabel(s: string) { return this.portalService.normalizeStatus(s); }
  getStatusClass(s: string) {
    const u = (s || '').toUpperCase();
    if (u === 'SCHEDULED' || u === 'CONFIRMED') return 'badge-scheduled';
    if (u === 'COMPLETED') return 'badge-completed';
    if (u === 'CANCELLED' || u === 'CANCELED') return 'badge-cancelled';
    return 'badge-default';
  }
}
