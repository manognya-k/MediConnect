import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { PatientPortalService, PortalLabReport } from '../../services/patient-portal.service';
import { BackendPatient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-lab-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-lab-reports.component.html',
  styleUrl: './patient-lab-reports.component.scss'
})
export class PatientLabReportsComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  patientInfo: BackendPatient | null = null;

  allReports: PortalLabReport[] = [];
  filtered: PortalLabReport[] = [];
  paged: PortalLabReport[] = [];

  loading = true;
  error = '';

  searchQuery = '';
  resultFilter = '';

  page = 1;
  pageSize = 8;
  totalPages = 1;

  totalCount = 0;
  normalCount = 0;
  abnormalCount = 0;
  pendingCount = 0;

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

        this.portalService.getAllLabReports().subscribe({
          next: (reports) => {
            this.allReports = pid
              ? [...reports.filter(r => r.patient?.patientId === pid)]
                  .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''))
              : [];
            this.computeStats();
            this.applyFilter();
            this.loading = false;
          },
          error: () => { this.error = 'Failed to load lab reports'; this.loading = false; }
        });
      },
      error: () => { this.error = 'Failed to load patient info'; this.loading = false; }
    });
  }

  private computeStats() {
    this.totalCount = this.allReports.length;
    this.normalCount = this.allReports.filter(r =>
      this.portalService.normalizeLabResult(r.result) === 'Normal'
    ).length;
    this.abnormalCount = this.allReports.filter(r =>
      this.portalService.normalizeLabResult(r.result) === 'Abnormal'
    ).length;
    this.pendingCount = this.allReports.filter(r =>
      this.portalService.normalizeLabResult(r.result) === 'Pending'
    ).length;
  }

  applyFilter() {
    let result = [...this.allReports];

    if (this.resultFilter) {
      const f = this.resultFilter;
      result = result.filter(r => this.portalService.normalizeLabResult(r.result) === f);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.testName || '').toLowerCase().includes(q) ||
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
  onFilterChange() { this.page = 1; this.applyFilter(); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.page = p; this.updatePage(); } }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages.slice(Math.max(0, this.page - 3), this.page + 2);
  }

  getDoctorName(r: PortalLabReport) { return r.doctor?.user?.name || '—'; }
  getHospital(r: PortalLabReport) { return r.hospital?.hospitalName || '—'; }
  formatDate(d: string | undefined) { return this.portalService.formatDate(d); }

  getResultLabel(result: string | undefined) { return this.portalService.normalizeLabResult(result); }

  getResultClass(result: string | undefined): string {
    const r = this.portalService.normalizeLabResult(result);
    if (r === 'Normal') return 'badge-normal';
    if (r === 'Abnormal') return 'badge-abnormal';
    return 'badge-pending';
  }

  downloadReport(r: PortalLabReport) {
    const lines = [
      'LAB REPORT — MediConnect',
      '─'.repeat(40),
      `Test    : ${r.testName || '—'}`,
      `Date    : ${this.formatDate(r.reportDate)}`,
      `Result  : ${this.getResultLabel(r.result)}`,
      `Doctor  : ${this.getDoctorName(r)}`,
      `Hospital: ${this.getHospital(r)}`,
      '─'.repeat(40),
      'Generated by MediConnect',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(r.testName || 'report').replace(/\s+/g, '_')}_${r.reportDate || 'report'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
