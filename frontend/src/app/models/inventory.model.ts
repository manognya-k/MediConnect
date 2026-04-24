export type ItemCategory = 'Medication' | 'Equipment' | 'Consumable' | 'PPE';
export type StockStatus = 'OK' | 'Low' | 'Critical';

export interface BackendInventory {
  itemId: number;
  itemName: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  hospital?: { hospitalId: number; hospitalName?: string } | null;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  category: ItemCategory;
  quantity: number;
  reorderLevel: number;
  status: StockStatus;
  stockPercent: number;
  barColor: string;
  raw: BackendInventory;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  categoryCount: number;
  ordersPending: number;
}

export interface LowStockAlert {
  count: number;
  itemNames: string[];
}

export interface InventoryFilter {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  status?: string;
}

export interface InventoryListResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}
