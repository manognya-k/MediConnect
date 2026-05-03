import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

import { AdminAnalyticsService } from '../../services/admin-analytics.service';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

Chart.defaults.color       = '#94A3B8';
Chart.defaults.font.family = "'DM Sans'";
Chart.defaults.font.size   = 10;
Chart.defaults.borderColor = 'rgba(255,255,255,.05)';

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

  hospitals  = ['All Hospitals', 'Mumbai Branch', 'Delhi Branch', 'Chennai Branch', 'Hyderabad Branch', 'Kolkata Branch', 'Bangalore Branch'];
  departments = ['All Departments', 'Cardiology', 'Orthopedics', 'Neurology', 'General', 'Emergency', 'Oncology'];
  ranges     = [{ val: '7d', label: 'Last 7 Days' }, { val: '30d', label: 'Last 30 Days' }, { val: '90d', label: 'Last 90 Days' }, { val: '1y', label: 'Last Year' }];

  // ── Stat card getters ────────────────────────────────────────────────────────

  get patientFlow(): string | number {
    return this.stats.totalPatients ?? 8432;
  }

  get occupancyPct(): string {
    if (this.stats.totalBeds && this.stats.occupiedBeds) {
      return ((this.stats.occupiedBeds / this.stats.totalBeds) * 100).toFixed(1) + '%';
    }
    return this.stats.bedOccupancy ?? '84%';
  }

  // ── Heatmap ──────────────────────────────────────────────────────────────────

  heatmapDays  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  heatmapHours = ['6AM','8AM','10AM','12PM','2PM','4PM','6PM','8PM','10PM','12AM','2AM','4AM'];
  heatmapData: number[][] = [
    [12,28,45,62,58,71,85,90,67,34,15,8],
    [10,24,42,68,72,78,92,88,71,38,18,7],
    [14,32,51,74,69,82,95,91,73,40,20,9],
    [11,27,48,65,63,75,88,85,68,35,16,8],
    [16,35,55,78,74,86,98,94,76,42,22,10],
    [8,18,30,42,45,52,60,58,44,22,10,5],
    [6,14,25,35,38,44,50,48,36,18,8,4]
  ];

  getHeatIntensity(val: number): string {
    if (val < 20) return 'rgba(10,175,184,0.1)';
    if (val < 40) return 'rgba(10,175,184,0.3)';
    if (val < 60) return 'rgba(10,175,184,0.5)';
    if (val < 80) return 'rgba(10,175,184,0.75)';
    return 'rgba(10,175,184,1)';
  }

  getHeatTextColor(val: number): string {
    return val < 40 ? '#94A3B8' : '#F1F5F9';
  }

  // ── Chart: Bed Occupancy (line) ───────────────────────────────────────────────

  bedOccupancyData: ChartData<'line'> = {
    labels: ['Apr 1','Apr 5','Apr 10','Apr 15','Apr 20','Apr 25','Apr 30'],
    datasets: [{
      label: 'Occupancy %',
      data: [72,75,79,83,81,87,84],
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239,68,68,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      borderWidth: 2
    }]
  };

  // ── Chart: Treatment Success Rate (bar) ───────────────────────────────────────

  treatmentSuccessData: ChartData<'bar'> = {
    labels: ['Cardiology','Orthopedics','Neurology','General','Emergency','Oncology'],
    datasets: [{
      label: 'Success Rate %',
      data: [96,94,91,97,88,82],
      backgroundColor: '#0AAFB8',
      borderRadius: 6
    }]
  };

  // ── Chart: Mortality Rate (line) ──────────────────────────────────────────────

  mortalityRateData: ChartData<'line'> = {
    labels: ['Nov','Dec','Jan','Feb','Mar','Apr'],
    datasets: [{
      label: 'Mortality Rate %',
      data: [2.1,2.3,1.9,2.0,1.7,1.8],
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245,158,11,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      borderWidth: 2
    }]
  };

  // ── Chart: Avg Length of Stay (bar) ──────────────────────────────────────────

  avgLosData: ChartData<'bar'> = {
    labels: ['ICU','Cardiology','Neurology','Orthopedics','General'],
    datasets: [{
      label: 'Days',
      data: [8.2,5.4,6.1,4.8,3.2],
      backgroundColor: '#8B5CF6',
      borderRadius: 6
    }]
  };

  // ── Chart options ─────────────────────────────────────────────────────────────

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        beginAtZero: false
      },
      x: { grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  constructor(private analyticsSvc: AdminAnalyticsService) {}

  ngOnInit(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.analyticsSvc.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ stats }) => {
        this.stats   = stats ?? {};
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
