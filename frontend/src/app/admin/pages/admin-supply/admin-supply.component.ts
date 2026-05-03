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
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminSupplyService } from '../../services/admin-supply.service';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

@Component({
  selector: 'app-admin-supply',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './admin-supply.component.html',
  styleUrl: './admin-supply.component.scss'
})
export class AdminSupplyComponent implements OnInit, OnDestroy {
  loading = true;
  inventory: any[] = [];
  alerts: any = {};
  searchTerm = '';
  activeTab = 'all';
  selectedItem: any = null;
  private destroy$ = new Subject<void>();

  lineData: ChartData<'line'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as string[],
    datasets: [
      {
        label: 'Paracetamol',
        data: [420, 380, 450, 410, 490, 320, 280],
        borderColor: '#0AAFB8',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        borderWidth: 2
      },
      {
        label: 'Aspirin',
        data: [210, 240, 195, 260, 230, 180, 150],
        borderColor: '#3B82F6',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        borderWidth: 2
      },
      {
        label: 'Metformin',
        data: [180, 165, 200, 175, 190, 140, 120],
        borderColor: '#10B981',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        borderWidth: 2
      },
      {
        label: 'Amlodipine',
        data: [95, 110, 88, 120, 105, 75, 65],
        borderColor: '#F59E0B',
        tension: 0.4,
        fill: false,
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
    labels: ['Cardiac', 'Diabetes', 'Analgesic', 'Antibiotics', 'Others'] as string[],
    datasets: [
      {
        data: [28, 22, 19, 18, 13],
        backgroundColor: ['#0AAFB8', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
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

  aiInsights = [
    {
      dot: '#EF4444',
      html: '<strong>Paracetamol</strong> stock at Chennai will deplete in <strong>4 days</strong> at current usage rate.'
    },
    {
      dot: '#F59E0B',
      html: '<strong>Aspirin</strong> inventory below reorder level at <strong>3 branches</strong>. Trigger purchase order.'
    },
    {
      dot: '#0AAFB8',
      html: 'Metformin consumption up <strong>18%</strong> this month. Adjust monthly procurement target.'
    }
  ];

  constructor(private service: AdminSupplyService) {}

  ngOnInit(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.service.getSupplyData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ inventory, alerts }) => {
        this.inventory = inventory;
        this.alerts = alerts;
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

  get filteredInventory(): any[] {
    let items = this.inventory;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(item =>
        (item.itemName || item.name || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term) ||
        (item.hospitalName || item.hospital?.hospitalName || '').toLowerCase().includes(term)
      );
    }

    if (this.activeTab === 'low') {
      items = items.filter(item => item.quantity <= (item.reorderLevel || 0));
    } else if (this.activeTab === 'expiring') {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      items = items.filter(item => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) <= soon;
      });
    }

    return items;
  }

  get totalItems(): number {
    return this.alerts.totalItems || this.inventory.length;
  }

  get lowStockCount(): number {
    return this.alerts.lowStockCount || 0;
  }

  getStockBadge(item: any): string {
    const qty = item.quantity ?? 0;
    const reorder = item.reorderLevel ?? 0;
    if (qty <= reorder) return 'b-red';
    if (qty <= reorder * 1.5) return 'b-amber';
    return 'b-green';
  }

  getStockLabel(item: any): string {
    const qty = item.quantity ?? 0;
    const reorder = item.reorderLevel ?? 0;
    if (qty <= reorder) return 'Critical';
    if (qty <= reorder * 1.5) return 'Low';
    return 'OK';
  }

  trackByIndex(index: number): number {
    return index;
  }
}
