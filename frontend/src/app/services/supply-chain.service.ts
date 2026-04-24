import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BackendInventory, InventoryItem, InventoryStats, LowStockAlert,
  InventoryFilter, InventoryListResponse, ItemCategory, StockStatus
} from '../models/inventory.model';

// TODO: No /api/supply-chain endpoints — using /api/inventory.
// No pagination, stats, reorder, or export endpoints on backend.
// All filtering/pagination/stats computed client-side.

const BASE = 'http://localhost:8081/api';

function deriveStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= reorderLevel * 0.5) return 'Critical';
  if (quantity <= reorderLevel)       return 'Low';
  return 'OK';
}

function computeStockPercent(quantity: number, reorderLevel: number): number {
  return Math.min(100, Math.round((quantity / (reorderLevel * 2)) * 100));
}

function computeBarColor(status: StockStatus, stockPercent: number): string {
  if (status === 'Critical') return '#E24B4A';
  if (status === 'Low')      return '#EF9F27';
  if (stockPercent >= 80)    return '#1D9E75';
  return '#185FA5';
}

function normalizeCategory(c: string): ItemCategory {
  const map: Record<string, ItemCategory> = {
    medication: 'Medication', equipment: 'Equipment',
    consumable: 'Consumable', ppe: 'PPE',
  };
  return map[(c || '').toLowerCase()] ?? 'Medication';
}

@Injectable({ providedIn: 'root' })
export class SupplyChainService {
  constructor(private http: HttpClient) {}

  mapToUI(b: BackendInventory): InventoryItem {
    const status = deriveStatus(b.quantity, b.reorderLevel);
    const pct    = computeStockPercent(b.quantity, b.reorderLevel);
    return {
      id:           String(b.itemId),
      itemName:     b.itemName,
      category:     normalizeCategory(b.category),
      quantity:     b.quantity,
      reorderLevel: b.reorderLevel,
      status,
      stockPercent: pct,
      barColor:     computeBarColor(status, pct),
      raw:          b,
    };
  }

  getAll(hospitalId?: number): Observable<BackendInventory[]> {
    const url = hospitalId
      ? `${BASE}/inventory/hospital/${hospitalId}`
      : `${BASE}/inventory`;
    return this.http.get<BackendInventory[]>(url);
  }

  applyFilter(all: InventoryItem[], filter: InventoryFilter): InventoryListResponse {
    let filtered = [...all];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(i => i.itemName.toLowerCase().includes(q));
    }
    if (filter.category) {
      filtered = filtered.filter(i => i.category === filter.category);
    }
    if (filter.status) {
      filtered = filtered.filter(i => i.status === filter.status);
    }

    filtered.sort((a, b) => {
      const order: Record<StockStatus, number> = { Critical: 0, Low: 1, OK: 2 };
      return order[a.status] - order[b.status];
    });

    const total = filtered.length;
    const start = (filter.page - 1) * filter.pageSize;
    return {
      data: filtered.slice(start, start + filter.pageSize),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  computeStats(items: InventoryItem[]): InventoryStats {
    const categories = new Set(items.map(i => i.category));
    const lowStock   = items.filter(i => i.status === 'Low' || i.status === 'Critical');
    return {
      totalItems:    items.length,
      lowStockCount: lowStock.length,
      categoryCount: categories.size,
      ordersPending: 2,  // TODO: no reorder tracking in backend
    };
  }

  getLowStockAlert(items: InventoryItem[]): LowStockAlert {
    const bad = items.filter(i => i.status === 'Critical' || i.status === 'Low');
    return { count: bad.length, itemNames: bad.map(i => i.itemName) };
  }

  create(body: Partial<BackendInventory>): Observable<BackendInventory> {
    return this.http.post<BackendInventory>(`${BASE}/inventory`, body);
  }

  update(id: number, body: Partial<BackendInventory>): Observable<BackendInventory> {
    return this.http.put<BackendInventory>(`${BASE}/inventory/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/inventory/${id}`);
  }

  // TODO: No /api/inventory/:id/reorder endpoint — simulating by updating quantity
  reorderItem(item: InventoryItem, hospitalId?: number): Observable<BackendInventory> {
    const reorderedQty = item.reorderLevel * 3;
    const body: Partial<BackendInventory> = {
      ...item.raw,
      quantity: reorderedQty,
      hospital: hospitalId ? { hospitalId } : item.raw.hospital ?? undefined,
    };
    return this.http.put<BackendInventory>(`${BASE}/inventory/${item.id}`, body);
  }

  exportInventory(items: InventoryItem[]): Observable<Blob> {
    // TODO: No /api/inventory/export endpoint — generating CSV client-side
    const header = 'Item Name,Category,Quantity,Reorder Level,Status\n';
    const rows = items.map(i =>
      `"${i.itemName}",${i.category},${i.quantity},${i.reorderLevel},${i.status}`
    ).join('\n');
    return of(new Blob([header + rows], { type: 'text/csv' }));
  }
}
