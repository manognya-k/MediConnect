import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminBed, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-beds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-beds.component.html',
  styleUrls: ['./admin-beds.component.scss']
})
export class AdminBedsComponent implements OnInit {
  allBeds: AdminBed[] = [];
  filtered: AdminBed[] = [];
  hospitals: Hospital[] = [];

  selectedHospitalId = '';
  statusFilter = '';
  wardFilter = '';

  loading = true;
  error = '';

  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;

  deleteConfirmId: number | null = null;

  form = { ward: '', bedNumber: '', status: 'AVAILABLE', hospitalId: '' };

  page = 1;
  pageSize = 10;

  totalBeds = 0;
  availableBeds = 0;
  occupiedBeds = 0;
  maintenanceBeds = 0;

  wards: string[] = [];

  constructor(public layout: LayoutService, private admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.admin.getHospitals(),
      beds: this.admin.getBeds()
    }).subscribe({
      next: ({ hospitals, beds }) => {
        this.hospitals = hospitals;
        this.allBeds = beds;
        this.wards = [...new Set(beds.map(b => b.ward).filter(Boolean))];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load bed data.';
        this.loading = false;
      }
    });
  }

  onHospitalChange(): void {
    this.page = 1;
    const subset = this.selectedHospitalId
      ? this.allBeds.filter(b => b.hospital?.hospitalId === Number(this.selectedHospitalId))
      : this.allBeds;
    this.wards = [...new Set(subset.map(b => b.ward).filter(Boolean))];
    if (this.wardFilter && !this.wards.includes(this.wardFilter)) {
      this.wardFilter = '';
    }
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.allBeds];

    if (this.selectedHospitalId) {
      result = result.filter(b => b.hospital?.hospitalId === Number(this.selectedHospitalId));
    }
    if (this.statusFilter) {
      result = result.filter(b => b.status?.toUpperCase() === this.statusFilter);
    }
    if (this.wardFilter) {
      result = result.filter(b => b.ward === this.wardFilter);
    }

    this.filtered = result;
    this.computeStats();
  }

  computeStats(): void {
    this.totalBeds = this.filtered.length;
    this.availableBeds = this.filtered.filter(b => b.status?.toUpperCase() === 'AVAILABLE').length;
    this.occupiedBeds = this.filtered.filter(b => b.status?.toUpperCase() === 'OCCUPIED').length;
    this.maintenanceBeds = this.filtered.filter(b => b.status?.toUpperCase() === 'MAINTENANCE').length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AdminBed[] {
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
    this.form = { ward: '', bedNumber: '', status: 'AVAILABLE', hospitalId: this.selectedHospitalId };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(b: AdminBed): void {
    this.form = {
      ward: b.ward,
      bedNumber: String(b.bedNumber),
      status: b.status,
      hospitalId: b.hospital ? String(b.hospital.hospitalId) : ''
    };
    this.editingId = b.bedId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
  }

  save(): void {
    if (!this.form.ward.trim() || !this.form.bedNumber) {
      this.saveError = 'Ward and Bed Number are required.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload = {
      ward: this.form.ward.trim(),
      bedNumber: Number(this.form.bedNumber),
      status: this.form.status,
      hospital: this.form.hospitalId ? { hospitalId: Number(this.form.hospitalId) } : null
    };

    const req = this.editingId !== null
      ? this.admin.updateBed(this.editingId, payload)
      : this.admin.createBed(payload);

    req.subscribe({
      next: (result) => {
        this.saving = false;
        if (result) {
          this.showModal = false;
          this.reloadBeds();
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
    this.admin.deleteBed(id).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.reloadBeds();
      },
      error: () => {
        this.deleteConfirmId = null;
      }
    });
  }

  private reloadBeds(): void {
    const req = this.selectedHospitalId
      ? this.admin.getBedsByHospital(Number(this.selectedHospitalId))
      : this.admin.getBeds();

    req.subscribe({
      next: (beds) => {
        this.allBeds = beds;
        this.wards = [...new Set(beds.map(b => b.ward).filter(Boolean))];
        this.applyFilter();
      }
    });
  }

  getStatusClass(s: string): string {
    switch (s?.toUpperCase()) {
      case 'AVAILABLE': return 'badge-available';
      case 'OCCUPIED': return 'badge-occupied';
      case 'MAINTENANCE': return 'badge-maintenance';
      default: return 'badge-default';
    }
  }
}
