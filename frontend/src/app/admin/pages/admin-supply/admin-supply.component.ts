import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ensureChartRegistered } from '../../../shared/chart-setup';

import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminSupplyService } from '../../services/admin-supply.service';
import { ToastService } from '../../../services/toast.service';

ensureChartRegistered();

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

  // New Order modal
  showNewOrder = false;
  newOrder = { itemName: '', category: '', quantity: 1, reorderLevel: 10, hospitalId: null as number | null, notes: '' };
  newOrderSubmitting = false;
  allHospitals: any[] = [];

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

  aiInsights: { dot: string; html: string }[] = [];

  constructor(private service: AdminSupplyService, private toast: ToastService) {}

  ngOnInit(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.service.getSupplyData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ inventory, alerts }) => {
        this.inventory = inventory;
        this.alerts = alerts;
        this.loading = false;
        this.buildInsights(alerts, inventory);
        this.buildDoughnut(inventory);
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

  private buildInsights(alerts: any, inventory: any[]) {
    const insights: { dot: string; html: string }[] = [];
    const lowCount: number = alerts?.lowStockCount || 0;
    const lowItems: any[] = alerts?.lowStockItems || [];

    if (lowCount > 0) {
      const first = lowItems[0];
      const name = first?.itemName || first?.name || 'An item';
      insights.push({ dot: '#EF4444', html: `<strong>${name}</strong> and <strong>${lowCount - 1}</strong> other item${lowCount > 1 ? 's' : ''} are at or below reorder level. Trigger purchase orders immediately.` });
    }
    if (lowItems.length > 1) {
      const critical = lowItems.filter((i: any) => (i.quantity || 0) === 0);
      if (critical.length) {
        insights.push({ dot: '#F59E0B', html: `<strong>${critical.length}</strong> item${critical.length > 1 ? 's are' : ' is'} completely out of stock. Urgent procurement required.` });
      }
    }
    const total: number = alerts?.totalItems || inventory.length;
    insights.push({ dot: '#0AAFB8', html: `<strong>${total}</strong> total inventory items tracked across all hospitals. ${lowCount} require restocking.` });
    this.aiInsights = insights.slice(0, 3);
  }

  private buildDoughnut(inventory: any[]) {
    if (!inventory.length) return;
    const counts: Record<string, number> = {};
    for (const item of inventory) {
      const cat = item.category || 'Others';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const colors = ['#0AAFB8', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    this.doughnutData = {
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: colors.slice(0, sorted.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
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

  // ── New Order ─────────────────────────────────────────────────────────────────

  openNewOrder() {
    this.newOrder = { itemName: '', category: '', quantity: 1, reorderLevel: 10, hospitalId: null, notes: '' };
    this.showNewOrder = true;
    if (!this.allHospitals.length) {
      this.service.getHospitals().pipe(takeUntil(this.destroy$)).subscribe(h => this.allHospitals = h);
    }
  }

  closeNewOrder() { this.showNewOrder = false; }

  submitNewOrder() {
    if (!this.newOrder.itemName?.trim()) {
      this.toast.show('Item name is required.', 'error');
      return;
    }
    if (!this.newOrder.quantity || this.newOrder.quantity < 1) {
      this.toast.show('Quantity must be at least 1.', 'error');
      return;
    }
    this.newOrderSubmitting = true;
    const body: any = {
      itemName:     this.newOrder.itemName.trim(),
      category:     this.newOrder.category || 'Others',
      quantity:     this.newOrder.quantity,
      reorderLevel: this.newOrder.reorderLevel || 10,
    };
    if (this.newOrder.hospitalId) {
      body.hospital = { hospitalId: +this.newOrder.hospitalId };
    }
    const itemLabel = `${this.newOrder.quantity}× ${this.newOrder.itemName}`;
    this.service.createInventory(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newOrderSubmitting = false;
        this.closeNewOrder();
        this.toast.show(`Order placed for ${itemLabel}.`, 'success');
        this.service.getSupplyData().pipe(takeUntil(this.destroy$)).subscribe(({ inventory, alerts }) => {
          this.inventory = inventory;
          this.alerts = alerts;
        });
      },
      error: () => {
        this.newOrderSubmitting = false;
        this.toast.show('Failed to place order. Please try again.', 'error');
      }
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  exportInventory() {
    const csv = ['Item,Category,Quantity,Reorder Level,Hospital,Status']
      .concat(this.inventory.map(item =>
        `"${item.itemName || item.name || ''}","${item.category || ''}","${item.quantity}","${item.reorderLevel || ''}","${item.hospitalName || item.hospital?.hospitalName || ''}","${this.getStockLabel(item)}"`
      )).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast.show('Inventory exported as CSV.', 'success');
  }
}
