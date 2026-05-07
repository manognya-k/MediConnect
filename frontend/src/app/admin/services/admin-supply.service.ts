import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminSupplyService {
  private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  getInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/inventory`).pipe(catchError(() => of([])));
  }

  getInventoryAlerts(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/inventory-alerts`).pipe(
      catchError(() => of({ lowStockCount: 0, lowStockItems: [], totalItems: 0 }))
    );
  }

  getSupplyData() {
    return forkJoin({ inventory: this.getInventory(), alerts: this.getInventoryAlerts() });
  }

  createInventory(body: any): Observable<any> {
    return this.http.post(`${this.base}/inventory`, body);
  }

  getHospitals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/hospitals`).pipe(catchError(() => of([])));
  }
}
