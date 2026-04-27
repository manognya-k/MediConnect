import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { PatientPortalService, PortalMedicalRecord } from '../../services/patient-portal.service';
import { BackendPatient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-medical-records.component.html',
  styleUrl: './patient-medical-records.component.scss'
})
export class PatientMedicalRecordsComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  patientInfo: BackendPatient | null = null;

  allRecords: PortalMedicalRecord[] = [];
  filtered: PortalMedicalRecord[] = [];
  paged: PortalMedicalRecord[] = [];

  loading = true;
  error = '';

  searchQuery = '';
  page = 1;
  pageSize = 8;
  totalPages = 1;

  totalCount = 0;
  thisMonthCount = 0;
  doctorsCount = 0;

  selectedRecord: PortalMedicalRecord | null = null;

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
          this.portalService.getPatientMedicalRecords(pid).subscribe({
            next: (records) => {
              this.allRecords = [...records].sort((a, b) =>
                (b.recordDate || '').localeCompare(a.recordDate || '')
              );
              this.computeStats();
              this.applyFilter();
              this.loading = false;
            },
            error: () => { this.error = 'Failed to load medical records'; this.loading = false; }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => { this.error = 'Failed to load patient info'; this.loading = false; }
    });
  }

  private computeStats() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;

    this.totalCount = this.allRecords.length;
    this.thisMonthCount = this.allRecords.filter(r => {
      if (!r.recordDate) return false;
      const [ry, rm] = r.recordDate.split('-').map(Number);
      return ry === y && rm === m;
    }).length;

    const doctorIds = new Set(this.allRecords.map(r => r.doctor?.doctorId).filter(Boolean));
    this.doctorsCount = doctorIds.size;
  }

  applyFilter() {
    let result = [...this.allRecords];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.diagnosis || '').toLowerCase().includes(q) ||
        (r.doctor?.user?.name || '').toLowerCase().includes(q)
      );
    }
    this.filtered = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.updatePage();
  }

  updatePage() {
    const start = (this.page - 1) * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  onSearch() { this.page = 1; this.applyFilter(); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.page = p; this.updatePage(); } }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages.slice(Math.max(0, this.page - 3), this.page + 2);
  }

  openRecord(rec: PortalMedicalRecord) { this.selectedRecord = rec; }
  closeModal() { this.selectedRecord = null; }

  getDoctorName(r: PortalMedicalRecord) { return r.doctor?.user?.name || '—'; }
  getDoctorSpec(r: PortalMedicalRecord) { return r.doctor?.specialization || ''; }
  getHospital(r: PortalMedicalRecord) { return (r as any).hospital?.hospitalName || '—'; }
  formatDate(d: string | undefined) { return this.portalService.formatDate(d); }

  getStatusLabel(r: PortalMedicalRecord): string {
    const diag = (r.diagnosis || '').toLowerCase();
    if (diag.includes('critical')) return 'Critical';
    if (diag.includes('chronic') || diag.includes('ongoing')) return 'Ongoing';
    if (r.treatment && r.treatment.trim()) return 'Treated';
    return 'Active';
  }

  getStatusClass(r: PortalMedicalRecord): string {
    const s = this.getStatusLabel(r);
    if (s === 'Critical') return 'badge-critical';
    if (s === 'Ongoing') return 'badge-ongoing';
    if (s === 'Treated') return 'badge-treated';
    return 'badge-active';
  }
}
