import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { LayoutService } from '../../services/layout.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import {
  AnalyticsRange, AnalyticsSummary, AppointmentTypeSplit,
  TopDiagnosis, NewPatientsPoint, AppointmentsOverTimePoint
} from '../../models/analytics.model';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('lineChart')     lineChart?:     BaseChartDirective;
  @ViewChild('doughnutChart') doughnutChart?: BaseChartDirective;
  @ViewChild('barChart')      barChart?:      BaseChartDirective;

  activeRange: AnalyticsRange = 'last30';
  loading = true;
  chartsLoading = false;
  error = '';
  exporting = false;
  diagBarsReady = false;

  doctorId: number | null = null;

  summary: AnalyticsSummary = {
    totalPatients: 0, totalPatientsChange: 0,
    totalAppointments: 0, totalAppointmentsChange: 0,
    labTestsOrdered: 0, avgConsultMinutes: 0,
  };

  typeSplit: AppointmentTypeSplit = { inPersonPercent: 68, videoPercent: 32 };
  topDiagnoses: TopDiagnosis[] = [];

  // ── Line chart ────────────────────────────────────
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'In-person',
        data: [],
        borderColor: '#185FA5',
        backgroundColor: 'rgba(24,95,165,0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#185FA5',
      },
      {
        label: 'Video',
        data: [],
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29,158,117,0.06)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#1D9E75',
      },
    ],
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { font: { size: 12 }, boxWidth: 10, padding: 14 },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#F0F0F0' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  // ── Doughnut chart ────────────────────────────────
  doughnutChartData: ChartData<'doughnut'> = {
    labels: ['In-person', 'Video'],
    datasets: [{ data: [68, 32], backgroundColor: ['#185FA5', '#1D9E75'], borderWidth: 0, hoverOffset: 4 }],
  };

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    cutout: '68%',
  };

  // ── Bar chart ─────────────────────────────────────
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'New patients',
        data: [],
        backgroundColor: '#EBF3FC',
        borderColor: '#185FA5',
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#F0F0F0' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  constructor(
    public layout: LayoutService,
    private svc: AnalyticsService,
    private toast: ToastService,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user) {
      this.dashSvc.getAllDoctors().pipe(takeUntil(this.destroy$)).subscribe({
        next: (docs) => {
          const doc = docs.find(d => d.user?.userId === user.userId);
          this.doctorId = doc?.doctorId ?? null;
          this.loadAnalytics();
        },
        error: () => this.loadAnalytics(),
      });
    } else {
      this.loadAnalytics();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => { this.diagBarsReady = true; }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRangeChange(range: string) {
    this.activeRange = range as AnalyticsRange;
    this.loadAnalytics(true);
  }

  loadAnalytics(isRefresh = false) {
    if (isRefresh) {
      this.chartsLoading = true;
      this.diagBarsReady = false;
    } else {
      this.loading = true;
    }
    this.error = '';

    this.svc.getAll(this.activeRange, this.doctorId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.summary   = data.summary;
          this.typeSplit = data.appointmentTypeSplit;
          this.topDiagnoses = data.topDiagnoses;

          this.updateLineChart(data.appointmentsOverTime);
          this.updateDoughnutChart(data.appointmentTypeSplit);
          this.updateBarChart(data.newPatientsPerMonth);

          this.loading = false;
          this.chartsLoading = false;
          setTimeout(() => { this.diagBarsReady = true; }, 50);
        },
        error: () => {
          this.loading = false;
          this.chartsLoading = false;
          this.error = 'Failed to load analytics data.';
        },
      });
  }

  private updateLineChart(pts: AppointmentsOverTimePoint[]) {
    this.lineChartData = {
      ...this.lineChartData,
      labels: pts.map(p => p.month),
      datasets: [
        { ...this.lineChartData.datasets[0], data: pts.map(p => p.inPerson) },
        { ...this.lineChartData.datasets[1], data: pts.map(p => p.video) },
      ],
    };
    setTimeout(() => this.lineChart?.update(), 0);
  }

  private updateDoughnutChart(split: AppointmentTypeSplit) {
    this.doughnutChartData = {
      ...this.doughnutChartData,
      datasets: [{
        ...this.doughnutChartData.datasets[0],
        data: [split.inPersonPercent, split.videoPercent],
      }],
    };
    setTimeout(() => this.doughnutChart?.update(), 0);
  }

  private updateBarChart(pts: NewPatientsPoint[]) {
    this.barChartData = {
      ...this.barChartData,
      labels: pts.map(p => p.month),
      datasets: [{ ...this.barChartData.datasets[0], data: pts.map(p => p.count) }],
    };
    setTimeout(() => this.barChart?.update(), 0);
  }

  exportReport() {
    this.exporting = true;
    this.svc.exportReport(this.activeRange).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const date = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediconnect_analytics_${this.activeRange}_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.toast.show('Report exported successfully.', 'success');
      },
      error: () => {
        this.exporting = false;
        this.toast.show('Export failed. Try again.', 'error');
      },
    });
  }

  formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }
}
