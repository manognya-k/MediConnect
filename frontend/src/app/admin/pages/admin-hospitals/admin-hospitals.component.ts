import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminHospitalsService } from '../../services/admin-hospitals.service';

@Component({
  selector: 'app-admin-hospitals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-hospitals.component.html',
  styleUrl: './admin-hospitals.component.scss'
})
export class AdminHospitalsComponent implements OnInit, OnDestroy {
  hospitals: any[] = [];
  filteredHospitals: any[] = [];
  selectedHospital: any = null;
  searchTerm = '';
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  private destroy$ = new Subject<void>();

  constructor(private svc: AdminHospitalsService) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => forkJoin({ hospitals: this.svc.getHospitals(), beds: this.svc.getBedOccupancy() })),
      takeUntil(this.destroy$)
    ).subscribe(({ hospitals, beds }) => {
      const bedMap = new Map(beds.map((b: any) => [b.hospitalId, b]));
      this.hospitals = hospitals.map((h: any) => ({
        ...h,
        bedInfo: bedMap.get(h.hospitalId) || { occupiedBeds: 0, availableBeds: h.availableBeds, occupancyPct: 0 }
      }));
      this.filteredHospitals = [...this.hospitals];
      if (this.hospitals.length) this.selectedHospital = this.hospitals[0];
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredHospitals = this.hospitals.filter(h =>
      h.hospitalName?.toLowerCase().includes(t) || h.city?.toLowerCase().includes(t)
    );
  }

  selectHospital(h: any) { this.selectedHospital = h; }

  occupancyPct(h: any): number {
    if (!h.totalBeds) return 0;
    return Math.round((h.totalBeds - h.availableBeds) / h.totalBeds * 100);
  }

  getStatusBadge(h: any): string {
    const pct = this.occupancyPct(h);
    if (pct >= 85) return 'b-red';
    if (pct >= 65) return 'b-amber';
    return 'b-green';
  }

  getStatusLabel(h: any): string {
    const pct = this.occupancyPct(h);
    if (pct >= 85) return 'Critical';
    if (pct >= 65) return 'Warning';
    return 'Active';
  }

  get totalHospitals() { return this.hospitals.length; }
  get operationalCount() { return this.hospitals.filter(h => this.occupancyPct(h) < 85).length; }
  get criticalCount() { return this.hospitals.filter(h => this.occupancyPct(h) >= 85).length; }
}
