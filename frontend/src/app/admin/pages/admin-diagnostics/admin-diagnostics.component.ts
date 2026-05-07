import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer, of } from 'rxjs';
import { switchMap, takeUntil, delay } from 'rxjs/operators';
import { AdminDiagnosticsService } from '../../services/admin-diagnostics.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

const AI_EXPLANATIONS: Record<string, string> = {
  NORMAL:   'All values are within the reference range. No immediate clinical action required. Continue routine monitoring as scheduled.',
  ABNORMAL: 'One or more values fall outside the reference range. Clinical review is recommended. Consider consulting the relevant specialist for follow-up management.',
  PENDING:  'The report is currently being processed. Results will be available within the expected turnaround time of 4–6 hours.',
};

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
  searchTerm  = '';
  statusFilter = '';          // '' = All, 'PENDING', 'READY', 'ABNORMAL'
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

  // AI Explain panel
  showAiExplain = false;
  aiExplainReport: any = null;
  aiExplainLoading = false;
  aiExplainText = '';

  constructor(private svc: AdminDiagnosticsService, public notifSvc: AdminNotificationService) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ reports, stats }) => {
        this.reports = reports;
        this.applyFilter();
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

  /** Called whenever search term or status filter changes */
  applyFilter() {
    let items = [...this.reports];

    // Text search (patient name or test name)
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      items = items.filter(r =>
        this.patientName(r).toLowerCase().includes(t) ||
        r.testName?.toLowerCase().includes(t) ||
        r.result?.toLowerCase().includes(t)
      );
    }

    // Status filter
    if (this.statusFilter) {
      items = items.filter(r => {
        const result = (r.result ?? '').toUpperCase();
        if (this.statusFilter === 'PENDING')  return !r.result || result === 'PENDING';
        if (this.statusFilter === 'ABNORMAL') return result.includes('ABNORMAL');
        if (this.statusFilter === 'READY')    return !!r.result && !result.includes('ABNORMAL') && result !== 'PENDING';
        return true;
      });
    }

    this.filteredReports = items.slice(0, 20);
  }

  /** Kept for backward compat — delegates to applyFilter */
  search() { this.applyFilter(); }

  /** Patient name from nested JPA structure */
  patientName(r: any): string {
    return r.patient?.user?.name ?? r.patientName ?? '—';
  }

  /** Patient code like PT-0021 */
  patientCode(r: any): string {
    const id = r.patient?.patientId;
    return id ? `PT-${String(id).padStart(4, '0')}` : '';
  }

  selectReport(r: any) {
    this.selectedReport = r;
    this.showAiExplain = false;
  }

  viewReport(r: any) {
    this.selectedReport = r;
    this.showAiExplain = false;
    setTimeout(() => {
      document.querySelector('.report-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  openAiExplain(r: any, event: Event) {
    event.stopPropagation();
    this.aiExplainReport = r;
    this.showAiExplain = true;
    this.aiExplainLoading = true;
    this.aiExplainText = '';
    of(null).pipe(delay(1000), takeUntil(this.destroy$)).subscribe(() => {
      this.aiExplainLoading = false;
      const result = (r.result || '').toUpperCase();
      if (result.includes('ABNORMAL')) {
        this.aiExplainText = AI_EXPLANATIONS['ABNORMAL'];
      } else if (!result || result === 'PENDING') {
        this.aiExplainText = AI_EXPLANATIONS['PENDING'];
      } else {
        this.aiExplainText = AI_EXPLANATIONS['NORMAL'];
      }
    });
  }

  closeAiExplain() {
    this.showAiExplain = false;
    this.aiExplainReport = null;
  }

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

  get totalReports()  { return this.stats.total    || this.reports.length; }
  get pendingCount()  { return this.stats.pending   || 0; }
  get abnormalCount() { return this.stats.abnormal  || 0; }
}
