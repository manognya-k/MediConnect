import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminDiagnosticsService } from '../../services/admin-diagnostics.service';

@Component({
  selector: 'app-admin-diagnostics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-diagnostics.component.html',
  styleUrl: './admin-diagnostics.component.scss'
})
export class AdminDiagnosticsComponent implements OnInit, OnDestroy {
  reports: any[] = [];
  filteredReports: any[] = [];
  stats: any = {};
  searchTerm = '';
  activeTab = 'labs';
  selectedReport: any = null;
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  private destroy$ = new Subject<void>();

  aiInsights = [
    { dot: '#EF4444', html: '<strong>LDL 185 mg/dL</strong> found in 3 reports — elevated cardiovascular risk. Statin therapy review recommended for flagged patients.' },
    { dot: '#F59E0B', html: '<strong>Troponin I elevated</strong> in 2 patients at Chennai branch. Immediate cardiology follow-up required.' },
    { dot: '#0AAFB8', html: '<strong>23 reports pending review</strong> across all branches. Average turnaround time is 4.2 hours — within acceptable range.' }
  ];

  constructor(private svc: AdminDiagnosticsService) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ reports, stats }) => {
        this.reports = reports;
        this.filteredReports = reports.slice(0, 20);
        this.stats = stats;
        if (reports.length) this.selectedReport = reports[0];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: string) { this.activeTab = t; }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredReports = this.reports.filter(r =>
      r.patientName?.toLowerCase().includes(t) || r.testName?.toLowerCase().includes(t) || r.result?.toLowerCase().includes(t)
    ).slice(0, 20);
  }

  selectReport(r: any) { this.selectedReport = r; }

  getResultBadge(result: string): string {
    if (!result || result === 'PENDING') return 'b-amber';
    if (result?.toUpperCase().includes('ABNORMAL')) return 'b-red';
    return 'b-green';
  }

  getResultLabel(result: string): string {
    if (!result || result === 'PENDING') return 'Pending';
    if (result?.toUpperCase().includes('ABNORMAL')) return 'Abnormal';
    return 'Ready';
  }

  get totalReports() { return this.stats.total || this.reports.length; }
  get pendingCount() { return this.stats.pending || 0; }
  get abnormalCount() { return this.stats.abnormal || 0; }
}
