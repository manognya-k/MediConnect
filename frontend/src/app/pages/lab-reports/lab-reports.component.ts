import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { LabReportService } from '../../services/lab-report.service';
import { ToastService } from '../../services/toast.service';
import { BackendLabReport, LabReport, LabReportFilter, LabReportStats } from '../../models/lab-report.model';
import { LabRequestFormComponent } from './lab-request-form/lab-request-form.component';

@Component({
  selector: 'app-lab-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LabRequestFormComponent],
  templateUrl: './lab-reports.component.html',
  styleUrl: './lab-reports.component.scss'
})
export class LabReportsComponent implements OnInit, OnDestroy {
  today = new Date();

  private allReports: BackendLabReport[] = [];
  reports: LabReport[] = [];
  stats: LabReportStats = {
    totalThisMonth: 0, pending: 0, abnormalFlags: 0,
    completedToday: 0, completedYesterday: 0
  };

  // Filters
  searchValue = '';
  testTypeFilter = '';
  statusFilter = '';
  dateFilter = '';
  page = 1;
  pageSize = 10;
  total = 0;

  // UI state
  loading = false;
  error = '';
  downloadingId: string | null = null;

  // Side panel
  selectedReport: LabReport | null = null;
  panelVisible = false;

  // Request form modal
  formVisible = false;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  readonly TEST_TYPES = [
    'Lipid Panel', 'ECG Analysis', 'HbA1c Test', 'CBC',
    'Troponin I', 'BNP', 'Coronary Angiogram', 'Other'
  ];

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private svc: LabReportService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user) { this.router.navigate(['/login']); return; }

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.searchValue = val;
      this.page = 1;
      this.applyFilter();
    });

    this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load() {
    this.loading = true;
    this.error = '';
    this.svc.getAll().subscribe({
      next: (all) => {
        this.allReports = all;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load lab reports. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const filter: LabReportFilter = {
      page: this.page,
      pageSize: this.pageSize,
      search: this.searchValue || undefined,
      testType: this.testTypeFilter || undefined,
      status: this.statusFilter || undefined,
      date: this.dateFilter || undefined,
    };
    const result = this.svc.applyFilter(this.allReports, filter);
    this.reports = result.data;
    this.total = result.total;
    this.stats = result.stats;
  }

  onSearch(val: string) { this.searchSubject.next(val); }
  onTestTypeChange() { this.page = 1; this.applyFilter(); }
  onStatusChange() { this.page = 1; this.applyFilter(); }
  onDateChange() { this.page = 1; this.applyFilter(); }
  retry() { this.load(); }

  reviewAbnormal() {
    this.statusFilter = 'Abnormal';
    this.page = 1;
    this.applyFilter();
    document.querySelector('.main-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Pagination ──────────────────────────────────
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIdx(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get endIdx(): number { return Math.min(this.page * this.pageSize, this.total); }

  getPageNumbers(): (number | '...')[] {
    const t = this.totalPages;
    if (t <= 5) return Array.from({ length: t }, (_, i) => i + 1);
    const p = this.page;
    if (p <= 3) return [1, 2, 3, 4, '...', t];
    if (p >= t - 2) return [1, '...', t - 3, t - 2, t - 1, t];
    return [1, '...', p - 1, p, p + 1, '...', t];
  }

  goToPage(p: number | '...') {
    if (typeof p !== 'number') return;
    this.page = p;
    this.applyFilter();
  }

  // ── Download ──────────────────────────────────
  download(report: LabReport, event: Event) {
    event.stopPropagation();
    if (report.status === 'Pending') return;
    this.downloadingId = report.id;
    try {
      this.svc.downloadReport(report);
      setTimeout(() => { this.downloadingId = null; }, 600);
    } catch {
      this.toast.show('Download failed. Try again.', 'error');
      this.downloadingId = null;
    }
  }

  downloadFromPanel() {
    if (!this.selectedReport || this.selectedReport.status === 'Pending') return;
    try {
      this.svc.downloadReport(this.selectedReport);
    } catch {
      this.toast.show('Download failed. Try again.', 'error');
    }
  }

  // ── Side Panel ───────────────────────────────────
  openPanel(report: LabReport) {
    this.selectedReport = report;
    this.panelVisible = true;
  }

  closePanel() {
    this.panelVisible = false;
    this.selectedReport = null;
  }

  // ── Request form modal ────────────────────────────
  openForm() { this.formVisible = true; }

  onFormSaved() {
    this.formVisible = false;
    this.load();
  }

  onFormCancelled() { this.formVisible = false; }

  // ── Badge helpers ────────────────────────────────
  statusBadgeClass(status: string): string {
    if (status === 'Abnormal') return 'b-red';
    if (status === 'Ready') return 'b-green';
    return 'b-amber';
  }
}
