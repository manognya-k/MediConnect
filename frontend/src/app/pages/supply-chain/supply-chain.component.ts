import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../services/layout.service';
import { SupplyChainService } from '../../services/supply-chain.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import {
  InventoryItem, InventoryStats, LowStockAlert, InventoryFilter
} from '../../models/inventory.model';
import { InventoryItemFormComponent } from './inventory-item-form/inventory-item-form.component';

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule, FormsModule, InventoryItemFormComponent],
  templateUrl: './supply-chain.component.html',
  styleUrl: './supply-chain.component.scss'
})
export class SupplyChainComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  loading = true;
  tableLoading = false;
  error = '';
  exporting = false;

  hospitalId: number | null = null;

  allItems: InventoryItem[] = [];
  displayedItems: InventoryItem[] = [];
  total = 0;

  stats: InventoryStats = { totalItems: 0, lowStockCount: 0, categoryCount: 0, ordersPending: 0 };
  alert: LowStockAlert = { count: 0, itemNames: [] };

  filter: InventoryFilter = { page: 1, pageSize: 10, search: '', category: '', status: '' };

  reorderingId: string | null = null;
  showForm = false;
  editingItem: InventoryItem | null = null;

  constructor(
    public layout: LayoutService,
    private svc: SupplyChainService,
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
          this.hospitalId = doc?.hospital?.hospitalId ?? null;
          this.loadAll();
        },
        error: () => this.loadAll(),
      });
    } else {
      this.loadAll();
    }

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      this.filter = { ...this.filter, search: q, page: 1 };
      this.applyFilter();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.svc.getAll(this.hospitalId ?? undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (raw) => {
        this.allItems = raw.map(b => this.svc.mapToUI(b));
        this.stats  = this.svc.computeStats(this.allItems);
        this.alert  = this.svc.getLowStockAlert(this.allItems);
        this.loading = false;
        this.applyFilter();
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load inventory.';
      },
    });
  }

  applyFilter() {
    const result = this.svc.applyFilter(this.allItems, this.filter);
    this.displayedItems = result.data;
    this.total = result.total;
  }

  onSearch(val: string) { this.searchSubject.next(val); }

  onCategoryChange(val: string) {
    this.filter = { ...this.filter, category: val, page: 1 };
    this.applyFilter();
  }

  onStatusChange(val: string) {
    this.filter = { ...this.filter, status: val, page: 1 };
    this.applyFilter();
  }

  goToPage(page: number) {
    this.filter = { ...this.filter, page };
    this.applyFilter();
  }

  get totalPages(): number { return Math.ceil(this.total / this.filter.pageSize); }

  get pageNumbers(): (number | -1)[] {
    const t = this.totalPages;
    if (t <= 5) return Array.from({ length: t }, (_, i) => i + 1);
    const cur = this.filter.page;
    if (cur <= 3) return [1, 2, 3, 4, -1, t];
    if (cur >= t - 2) return [1, -1, t - 3, t - 2, t - 1, t];
    return [1, -1, cur - 1, cur, cur + 1, -1, t];
  }

  get showStart(): number { return (this.filter.page - 1) * this.filter.pageSize + 1; }
  get showEnd(): number   { return Math.min(this.filter.page * this.filter.pageSize, this.total); }

  reorder(item: InventoryItem) {
    this.reorderingId = item.id;
    this.svc.reorderItem(item, this.hospitalId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reorderingId = null;
          this.toast.show(`Reorder placed for ${item.itemName}.`, 'success');
          this.loadAll();
        },
        error: () => {
          this.reorderingId = null;
          this.toast.show('Reorder failed. Try again.', 'error');
        },
      });
  }

  openAdd() { this.editingItem = null; this.showForm = true; }
  openEdit(item: InventoryItem) { this.editingItem = item; this.showForm = true; }

  onFormSaved() {
    this.showForm = false;
    this.loadAll();
  }

  exportInventory() {
    this.exporting = true;
    this.svc.exportInventory(this.allItems).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const date = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediconnect_inventory_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.toast.show('Inventory exported successfully.', 'success');
      },
      error: () => {
        this.exporting = false;
        this.toast.show('Export failed. Try again.', 'error');
      },
    });
  }

  quantityClass(item: InventoryItem): string {
    if (item.status === 'Critical') return 'qty-critical';
    if (item.status === 'Low')      return 'qty-low';
    return '';
  }

  statusClass(status: string): string {
    if (status === 'Critical') return 'b-red';
    if (status === 'Low')      return 'b-amber';
    return 'b-green';
  }

  trackById(_: number, item: InventoryItem) { return item.id; }
}
