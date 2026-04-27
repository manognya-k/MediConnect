import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminInventoryItem, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-inventory.component.scss']
})
export class AdminInventoryComponent implements OnInit {
  allItems: AdminInventoryItem[] = [];
  filtered: AdminInventoryItem[] = [];
  hospitals: Hospital[] = [];

  selectedHospitalId = '';
  categoryFilter = '';
  stockFilter = '';

  categories: string[] = [];

  loading = true;
  error = '';

  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;

  deleteConfirmId: number | null = null;

  form = { itemName: '', category: '', quantity: '', reorderLevel: '', hospitalId: '' };

  page = 1;
  pageSize = 10;

  totalItems = 0;
  lowStockItems = 0;
  totalQuantity = 0;

  constructor(public layout: LayoutService, private admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.admin.getHospitals(),
      items: this.admin.getInventory()
    }).subscribe({
      next: ({ hospitals, items }) => {
        this.hospitals = hospitals;
        this.allItems = items;
        this.categories = [...new Set(items.map(i => i.category).filter(Boolean))];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load inventory data.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    let result = [...this.allItems];

    if (this.selectedHospitalId) {
      result = result.filter(i => i.hospital?.hospitalId === Number(this.selectedHospitalId));
    }
    if (this.categoryFilter) {
      result = result.filter(i => i.category === this.categoryFilter);
    }
    if (this.stockFilter === 'low') {
      result = result.filter(i => this.isLowStock(i));
    } else if (this.stockFilter === 'ok') {
      result = result.filter(i => !this.isLowStock(i));
    }

    this.filtered = result;
    this.computeStats();
    this.page = 1;
  }

  computeStats(): void {
    this.totalItems = this.filtered.length;
    this.lowStockItems = this.filtered.filter(i => this.isLowStock(i)).length;
    this.totalQuantity = this.filtered.reduce((sum, i) => sum + (i.quantity || 0), 0);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AdminInventoryItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  openAdd(): void {
    this.form = { itemName: '', category: '', quantity: '', reorderLevel: '', hospitalId: this.selectedHospitalId };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(item: AdminInventoryItem): void {
    this.form = {
      itemName: item.itemName,
      category: item.category,
      quantity: String(item.quantity),
      reorderLevel: String(item.reorderLevel),
      hospitalId: item.hospital ? String(item.hospital.hospitalId) : ''
    };
    this.editingId = item.itemId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
  }

  save(): void {
    if (!this.form.itemName.trim() || !this.form.category.trim()) {
      this.saveError = 'Item Name and Category are required.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload = {
      itemName: this.form.itemName.trim(),
      category: this.form.category.trim(),
      quantity: Number(this.form.quantity) || 0,
      reorderLevel: Number(this.form.reorderLevel) || 0,
      hospital: this.form.hospitalId ? { hospitalId: Number(this.form.hospitalId) } : null
    };

    const req = this.editingId !== null
      ? this.admin.updateInventoryItem(this.editingId, payload)
      : this.admin.createInventoryItem(payload);

    req.subscribe({
      next: (result) => {
        this.saving = false;
        if (result) {
          this.showModal = false;
          this.reloadInventory();
        } else {
          this.saveError = 'Operation failed. Please try again.';
        }
      },
      error: () => {
        this.saving = false;
        this.saveError = 'An error occurred. Please try again.';
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(id: number): void {
    this.admin.deleteInventoryItem(id).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.reloadInventory();
      },
      error: () => {
        this.deleteConfirmId = null;
      }
    });
  }

  private reloadInventory(): void {
    const req = this.selectedHospitalId
      ? this.admin.getInventoryByHospital(Number(this.selectedHospitalId))
      : this.admin.getInventory();

    req.subscribe({
      next: (items) => {
        this.allItems = items;
        this.categories = [...new Set(items.map(i => i.category).filter(Boolean))];
        this.applyFilter();
      }
    });
  }

  isLowStock(item: AdminInventoryItem): boolean {
    return item.quantity <= item.reorderLevel;
  }

  getStockClass(item: AdminInventoryItem): string {
    return this.isLowStock(item) ? 'stock-low' : 'stock-ok';
  }

  get lowStockForSelectedHospital(): number {
    const subset = this.selectedHospitalId
      ? this.allItems.filter(i => i.hospital?.hospitalId === Number(this.selectedHospitalId))
      : this.allItems;
    return subset.filter(i => this.isLowStock(i)).length;
  }
}
