import {
  Component, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ensureChartRegistered } from '../../../shared/chart-setup';

import { AdminOverviewService } from '../../services/admin-overview.service';
import { AdminAuthService }     from '../../services/admin-auth.service';
import { AdminNotificationService } from '../../services/admin-notification.service';
import {
  AdminOverviewData, StatCard, HospitalPin, AiInsight
} from '../../models/admin-overview.model';

ensureChartRegistered();

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, DatePipe, NgChartsModule],
  templateUrl: './admin-overview.component.html',
  styleUrl:    './admin-overview.component.scss'
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;

  stats:       StatCard[]    = [];
  hospitalPins: HospitalPin[] = [];
  aiInsights:  AiInsight[]   = [];
  lastUpdated: Date | null   = null;

  today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  diseaseLabels: string[] = [];
  diseaseSlices: { label: string; value: number; color: string }[] = [];

  // ── Chart configs ──────────────────────────────────────────────────────────

  inflowChartData: ChartData<'line'> = { labels: [], datasets: [] };
  inflowChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,.04)' } },
      x: { grid: { display: false } }
    }
  };

  diseaseChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  diseaseChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '68%',
    plugins: { legend: { display: false } }
  };

  bedChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  bedChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,.04)' },
        max: 100,
        ticks: { callback: (v: any) => v + '%' }
      }
    }
  };

  revenueChartData: ChartData<'line'> = { labels: [], datasets: [] };
  revenueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { callback: (v: any) => '₹' + v + 'M' }
      },
      x: { grid: { display: false } }
    }
  };

  constructor(
    private overviewSvc: AdminOverviewService,
    private adminAuth:   AdminAuthService,
    public notifSvc: AdminNotificationService
  ) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.overviewSvc.getOverview()),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.applyData(data);
      this.isLoading = false;
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private applyData(d: AdminOverviewData): void {
    this.stats        = d.stats;
    this.hospitalPins = d.hospitalPins;
    this.aiInsights   = d.aiInsights;
    this.lastUpdated  = d.lastUpdated;

    // Patient Inflow
    this.inflowChartData = {
      labels:   d.inflowData.map(p => p.label),
      datasets: [
        {
          label:           'Inpatient',
          data:            d.inflowData.map(p => p.inpatient),
          borderColor:     '#0AAFB8',
          backgroundColor: 'rgba(10,175,184,.08)',
          tension:         0.4,
          fill:            true,
          pointRadius:     2,
          borderWidth:     2
        },
        {
          label:           'Outpatient',
          data:            d.inflowData.map(p => p.outpatient),
          borderColor:     '#3B82F6',
          backgroundColor: 'rgba(59,130,246,.05)',
          tension:         0.4,
          fill:            true,
          pointRadius:     2,
          borderWidth:     2
        }
      ]
    };

    // Disease distribution
    this.diseaseLabels  = d.diseaseData.map(s => s.label);
    this.diseaseSlices  = d.diseaseData.map(s => ({ label: s.label, value: s.value, color: s.color }));
    this.diseaseChartData = {
      labels:   d.diseaseData.map(s => s.label),
      datasets: [{
        data:            d.diseaseData.map(s => s.value),
        backgroundColor: d.diseaseData.map(s => s.color),
        borderWidth:     0,
        hoverOffset:     4
      }]
    };

    // Bed occupancy
    this.bedChartData = {
      labels:   d.bedData.map(b => b.hospital),
      datasets: [
        {
          label:           'Occupied',
          data:            d.bedData.map(b => b.occupied),
          backgroundColor: 'rgba(10,175,184,.6)',
          borderRadius:    4
        },
        {
          label:           'Available',
          data:            d.bedData.map(b => b.available),
          backgroundColor: 'rgba(16,185,129,.3)',
          borderRadius:    4
        }
      ]
    };

    // Revenue trend
    this.revenueChartData = {
      labels:   d.revenueData.map(r => r.label),
      datasets: [{
        label:           'Revenue (₹M)',
        data:            d.revenueData.map(r => r.revenue),
        borderColor:     '#F59E0B',
        backgroundColor: 'rgba(245,158,11,.1)',
        tension:         0.4,
        fill:            true,
        pointRadius:     3,
        borderWidth:     2
      }]
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  pinColor(status: string): string {
    const map: Record<string, string> = {
      available: '#10B981',
      limited:   '#F59E0B',
      critical:  '#EF4444'
    };
    return map[status] ?? '#94A3B8';
  }

  statIconColor(accent: string): string {
    const map: Record<string, string> = {
      teal:  'var(--teal)', green: 'var(--green)',
      red:   'var(--red)',  amber: 'var(--amber)', blue: 'var(--blue)'
    };
    return map[accent] ?? '#94A3B8';
  }

  statSubStyle(accent: string): Record<string, string> {
    const map: Record<string, string> = {
      teal:  'var(--teal-lt)',  green: 'var(--green-lt)',
      red:   'var(--red-lt)',   amber: 'var(--amber-lt)', blue: 'var(--blue-lt)'
    };
    const colorMap: Record<string, string> = {
      teal:  'var(--teal)',  green: 'var(--green)',
      red:   'var(--red)',   amber: 'var(--amber)', blue: 'var(--blue)'
    };
    return { background: map[accent] ?? 'var(--surf3)', color: colorMap[accent] ?? 'var(--mid)' };
  }

  get adminName(): string { return this.adminAuth.adminName; }
}
