import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminHospitalsService } from '../../services/admin-hospitals.service';
import { ToastService } from '../../../services/toast.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

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

  // Edit modal
  showEdit = false;
  editData: any = {};
  editSubmitting = false;

  // Add Hospital modal
  showAddHospital = false;
  addData = { hospitalName: '', city: '', address: '', phone: '', totalBeds: 0, availableBeds: 0 };
  addSubmitting = false;

  constructor(
    private svc: AdminHospitalsService,
    private toast: ToastService,
    public notifSvc: AdminNotificationService
  ) {}

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

  // ── Edit Hospital ─────────────────────────────────────────────────────────────

  openEditHospital(h: any, event: Event) {
    event.stopPropagation();
    this.editData = {
      hospitalId:    h.hospitalId,
      hospitalName:  h.hospitalName || '',
      city:          h.city || '',
      totalBeds:     h.totalBeds || 0,
      availableBeds: h.availableBeds || 0,
    };
    this.showEdit = true;
  }

  closeEditHospital() {
    this.showEdit = false;
  }

  submitEditHospital() {
    if (!this.editData.hospitalName?.trim()) {
      this.toast.show('Hospital name is required.', 'error');
      return;
    }
    this.editSubmitting = true;
    this.svc.updateHospital(this.editData.hospitalId, this.editData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.editSubmitting = false;
        this.closeEditHospital();
        this.toast.show('Hospital updated successfully.', 'success');
        // Update local state
        const patch = (list: any[]) => list.map(h =>
          h.hospitalId === this.editData.hospitalId ? { ...h, ...this.editData } : h
        );
        this.hospitals = patch(this.hospitals);
        this.filteredHospitals = patch(this.filteredHospitals);
        if (this.selectedHospital?.hospitalId === this.editData.hospitalId) {
          this.selectedHospital = { ...this.selectedHospital, ...this.editData };
        }
      },
      error: () => {
        this.editSubmitting = false;
        this.toast.show('Failed to update hospital.', 'error');
      }
    });
  }

  // ── Add Hospital ─────────────────────────────────────────────────────────────

  openAddHospital() {
    this.addData = { hospitalName: '', city: '', address: '', phone: '', totalBeds: 0, availableBeds: 0 };
    this.showAddHospital = true;
  }

  closeAddHospital() { this.showAddHospital = false; }

  submitAddHospital() {
    if (!this.addData.hospitalName?.trim()) {
      this.toast.show('Hospital name is required.', 'error');
      return;
    }
    this.addSubmitting = true;
    this.svc.createHospital(this.addData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.addSubmitting = false;
        this.closeAddHospital();
        this.toast.show('Hospital added successfully.', 'success');
        // Refresh with full forkJoin to preserve bedInfo enrichment
        forkJoin({ hospitals: this.svc.getHospitals(), beds: this.svc.getBedOccupancy() })
          .pipe(takeUntil(this.destroy$))
          .subscribe(({ hospitals, beds }) => {
            const bedMap = new Map(beds.map((b: any) => [b.hospitalId, b]));
            this.hospitals = hospitals.map((h: any) => ({
              ...h,
              bedInfo: bedMap.get(h.hospitalId) || { occupiedBeds: 0, availableBeds: h.availableBeds, occupancyPct: 0 }
            }));
            this.filteredHospitals = [...this.hospitals];
          });
      },
      error: () => {
        this.addSubmitting = false;
        this.toast.show('Failed to add hospital.', 'error');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

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
