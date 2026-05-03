import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
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
  ArcElement,
  Filler
} from 'chart.js';

import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminRevenueService } from '../../services/admin-revenue.service';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './admin-revenue.component.html',
  styleUrl: './admin-revenue.component.scss'
})
export class AdminRevenueComponent implements OnInit, OnDestroy {
  loading = true;
  stats: any = {};
  private destroy$ = new Subject<void>();

  lineData: ChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as string[],
    datasets: [
      {
        label: 'Revenue (₹M)',
        data: [3.1, 3.6, 3.9, 4.2, 4.8, 4.5, 5.1, 4.9, 5.4, 5.2, 5.8, 6.1],
        borderColor: '#0AAFB8',
        backgroundColor: 'rgba(10,175,184,0.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        borderWidth: 2
      }
    ]
  };

  lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { size: 11 }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94A3B8' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        ticks: { color: '#94A3B8' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };

  doughnutData: ChartData<'doughnut'> = {
    labels: ['OPD', 'Surgery', 'Emergency', 'ICU', 'Pharmacy', 'Lab'] as string[],
    datasets: [
      {
        data: [30, 24, 16, 14, 10, 6],
        backgroundColor: ['#0AAFB8', '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94A3B8',
          font: { size: 11 },
          padding: 16,
          usePointStyle: true
        }
      }
    },
    cutout: '65%'
  };

  bills = [
    { id: 'BL-2841', patient: 'Rahul Sharma',  department: 'Cardiology', amount: '₹42,500',   date: 'Apr 30', status: 'paid' },
    { id: 'BL-2840', patient: 'Priya Nair',    department: 'Surgery',    amount: '₹1,28,000', date: 'Apr 30', status: 'pending' },
    { id: 'BL-2839', patient: 'Amit Verma',    department: 'Emergency',  amount: '₹18,750',   date: 'Apr 29', status: 'paid' },
    { id: 'BL-2838', patient: 'Sneha Patel',   department: 'ICU',        amount: '₹95,000',   date: 'Apr 29', status: 'overdue' },
    { id: 'BL-2837', patient: 'Vikram Singh',  department: 'OPD',        amount: '₹3,200',    date: 'Apr 28', status: 'paid' },
    { id: 'BL-2836', patient: 'Deepa Rao',     department: 'Lab',        amount: '₹8,600',    date: 'Apr 28', status: 'pending' }
  ];

  claims = [
    { id: 'IC-5521', patient: 'Rahul Sharma', insurer: 'Star Health',    amount: '₹38,000',  status: 'approved' },
    { id: 'IC-5520', patient: 'Meera Joshi',  insurer: 'HDFC Ergo',      amount: '₹72,500',  status: 'processing' },
    { id: 'IC-5519', patient: 'Karan Mehta',  insurer: 'New India',      amount: '₹1,15,000',status: 'rejected' },
    { id: 'IC-5518', patient: 'Sunita Gupta', insurer: 'Max Bupa',       amount: '₹25,000',  status: 'approved' },
    { id: 'IC-5517', patient: 'Ravi Kumar',   insurer: 'Bajaj Allianz',  amount: '₹48,000',  status: 'processing' }
  ];

  aiInsights = [
    {
      dot: '#10B981',
      html: 'Revenue projected to reach <strong>₹6.5M/day</strong> by Q3 2026 based on current growth trajectory.'
    },
    {
      dot: '#F59E0B',
      html: '<strong>Insurance claim rejections</strong> up 12% this month. Review documentation process.'
    },
    {
      dot: '#0AAFB8',
      html: 'Cardiology dept generating <strong>28% of total revenue</strong> with highest per-visit value.'
    }
  ];

  constructor(private service: AdminRevenueService) {}

  ngOnInit(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.service.getAppointmentStats()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getBillBadge(status: string): string {
    if (status === 'paid')    return 'b-green';
    if (status === 'pending') return 'b-amber';
    if (status === 'overdue') return 'b-red';
    return 'b-blue';
  }

  getClaimBadge(status: string): string {
    if (status === 'approved')   return 'b-green';
    if (status === 'processing') return 'b-amber';
    if (status === 'rejected')   return 'b-red';
    return 'b-blue';
  }

  trackByIndex(index: number): number {
    return index;
  }
}
