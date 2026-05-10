import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ensureChartRegistered } from '../../../shared/chart-setup';

import { AdminAnalyticsService } from '../../services/admin-analytics.service';

ensureChartRegistered();

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.scss'
})
export class AdminAnalyticsComponent implements OnInit, OnDestroy {

  loading = true;
  stats: any = {};
  private destroy$ = new Subject<void>();

  selectedHospital = 'All Hospitals';
  selectedDept     = 'All Departments';
  selectedRange    = '30d';

  hospitals:   string[] = ['All Hospitals'];
  departments: string[] = ['All Departments'];
  ranges = [
    { val: '7d',  label: 'Last 7 Days',  days: 7   },
    { val: '30d', label: 'Last 30 Days', days: 30  },
    { val: '90d', label: 'Last 90 Days', days: 90  },
    { val: '1y',  label: 'Last Year',    days: 365 }
  ];

  private hospitalMap = new Map<string, number>();

  // ── Computed stat values from real data ───────────────────────────────────────
  treatmentSuccessPct  = '—';
  cancellationRatePct  = '—';

  get patientFlow(): number { return this.stats.totalPatients ?? 0; }

  get newPatientsThisMonth(): number { return this.stats.newPatientsThisMonth ?? 0; }

  get totalAppointments(): number { return this.stats.totalAppointments ?? 0; }
  get confirmedCount(): number   { return this.stats.confirmedAppointments ?? 0; }
  get pendingCount(): number     { return this.stats.pendingAppointments ?? 0; }
  get cancelledCount(): number   { return this.stats.cancelledAppointments ?? 0; }
  get completedCount(): number   { return this.stats.completedAppointments ?? 0; }

  get occupancyPct(): string {
    if (this.stats.totalBeds && this.stats.occupiedBeds != null)
      return ((this.stats.occupiedBeds / this.stats.totalBeds) * 100).toFixed(1) + '%';
    return this.stats.icuOccupancyPct != null ? `${this.stats.icuOccupancyPct}%` : '—';
  }

  // ── Heatmap (real appointment day × time-slot distribution) ──────────────────

  heatmapDays  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  heatmapHours = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM', '12AM', '2AM', '4AM'];
  heatmapData: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));

  getHeatIntensity(val: number, max: number): string {
    if (!max || val === 0) return 'rgba(10,175,184,0.06)';
    const ratio = val / max;
    if (ratio < 0.2)  return 'rgba(10,175,184,0.15)';
    if (ratio < 0.4)  return 'rgba(10,175,184,0.35)';
    if (ratio < 0.6)  return 'rgba(10,175,184,0.55)';
    if (ratio < 0.8)  return 'rgba(10,175,184,0.75)';
    return 'rgba(10,175,184,1)';
  }

  getHeatTextColor(val: number, max: number): string {
    if (!max || val === 0) return '#CBD5E1';
    return val / max < 0.4 ? '#94A3B8' : '#F1F5F9';
  }

  get heatmapMax(): number {
    return Math.max(1, ...this.heatmapData.map(row => Math.max(...row)));
  }

  // ── Charts ────────────────────────────────────────────────────────────────────

  bedOccupancyData: ChartData<'line'> = { labels: [], datasets: [{ label: 'Occupancy %', data: [], borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2 }] };

  treatmentSuccessData: ChartData<'bar'> = { labels: [], datasets: [{ label: 'Completion Rate %', data: [], backgroundColor: '#0AAFB8', borderRadius: 6 }] };

  cancellationTrendData: ChartData<'line'> = { labels: [], datasets: [{ label: 'Cancellation Rate %', data: [], borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: true, pointRadius: 3, borderWidth: 2 }] };

  apptByDeptData: ChartData<'bar'> = { labels: [], datasets: [{ label: 'Total Appointments', data: [], backgroundColor: '#8B5CF6', borderRadius: 6 }] };

  // ── Chart options ─────────────────────────────────────────────────────────────

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } }
    }
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } }
    }
  };

  constructor(private analyticsSvc: AdminAnalyticsService) {}

  private buildFilters(): { hospitalId?: number; department?: string; rangeDays?: number } {
    const filters: { hospitalId?: number; department?: string; rangeDays?: number } = {};
    if (this.selectedHospital !== 'All Hospitals') {
      const id = this.hospitalMap.get(this.selectedHospital);
      if (id) filters.hospitalId = id;
    }
    if (this.selectedDept !== 'All Departments') {
      filters.department = this.selectedDept;
    }
    const range = this.ranges.find(r => r.val === this.selectedRange);
    if (range) filters.rangeDays = range.days;
    return filters;
  }

  private loadAnalytics(): void {
    this.analyticsSvc.getAnalytics(this.buildFilters()).subscribe({
      next: (analytics) => {
        if (analytics && typeof analytics === 'object') this.applyAnalytics(analytics);
      }
    });
  }

  onFilterChange(): void { this.loadAnalytics(); }

  ngOnInit(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.analyticsSvc.getAllData(this.buildFilters())),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ stats, bedOccupancy, hospitals, analytics }) => {
        this.stats   = stats ?? {};
        this.loading = false;

        // Hospitals filter dropdown + build id map for filter params
        this.hospitalMap.clear();
        (hospitals as any[]).forEach((h: any) => {
          const name = h.hospitalName || h.name || '';
          if (name && h.hospitalId) this.hospitalMap.set(name, h.hospitalId);
        });
        const names = Array.from(this.hospitalMap.keys());
        this.hospitals = ['All Hospitals', ...names];

        // Bed occupancy trend per hospital
        if ((bedOccupancy as any[])?.length) {
          this.bedOccupancyData = {
            labels: (bedOccupancy as any[]).map((h: any) => h.city || h.hospitalName || ''),
            datasets: [{ label: 'Occupancy %', data: (bedOccupancy as any[]).map((h: any) => h.occupancyPct || 0), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2 }]
          };
        }

        if (analytics && typeof analytics === 'object') {
          this.applyAnalytics(analytics);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  private applyAnalytics(a: any): void {
    // ── Treatment completion rate by department ─────────────────────────────
    const completed: Record<string, number> = a.completedByDepartment ?? {};
    const total:     Record<string, number> = a.totalByDepartment     ?? {};
    const depts = Object.keys(total);

    // Populate departments filter
    this.departments = ['All Departments', ...depts];

    if (depts.length) {
      const rates = depts.map(d => total[d] > 0 ? Math.round((completed[d] || 0) / total[d] * 100) : 0);
      this.treatmentSuccessData = {
        labels: depts,
        datasets: [{ label: 'Completion Rate %', data: rates, backgroundColor: '#0AAFB8', borderRadius: 6 }]
      };
      const avgRate = rates.length ? Math.round(rates.reduce((s, v) => s + v, 0) / rates.length) : 0;
      this.treatmentSuccessPct = avgRate + '%';
    }

    // ── Cancellation rate trend (last 6 months) ─────────────────────────────
    const cancRate: Record<string, number> = a.cancellationRate ?? {};
    const months = Object.keys(cancRate);
    if (months.length) {
      const rates = months.map(m => cancRate[m] ?? 0);
      this.cancellationTrendData = {
        labels: months,
        datasets: [{ label: 'Cancellation Rate %', data: rates, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: true, pointRadius: 3, borderWidth: 2 }]
      };
      const latest = rates[rates.length - 1] ?? 0;
      this.cancellationRatePct = latest.toFixed(1) + '%';
    }

    // ── Appointments by department (volume) ─────────────────────────────────
    if (depts.length) {
      this.apptByDeptData = {
        labels: depts,
        datasets: [{ label: 'Total Appointments', data: depts.map(d => total[d] ?? 0), backgroundColor: '#8B5CF6', borderRadius: 6 }]
      };
    }

    // ── Heatmap from real appointment day × time-slot data ──────────────────
    const hm: number[][] = a.heatmap ?? [];
    if (hm.length === 7 && hm[0]?.length === 12) {
      this.heatmapData = hm;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // onFilterChange() { /* charts update automatically on next poll; future: pass filter params to API */ }
}
