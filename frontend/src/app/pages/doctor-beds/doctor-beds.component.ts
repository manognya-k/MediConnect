import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AdminService, AdminBed } from '../../services/admin.service';

@Component({
  selector: 'app-doctor-beds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-beds.component.html',
  styleUrls: ['./doctor-beds.component.scss']
})
export class DoctorBedsComponent implements OnInit {
  hospitalId: number | null = null;
  hospitalName = '';

  allBeds: AdminBed[] = [];
  filtered: AdminBed[] = [];

  statusFilter = '';
  wardFilter = '';
  wards: string[] = [];

  loading = true;
  error = '';

  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;
  deleteConfirmId: number | null = null;

  form = { ward: '', bedNumber: '', status: 'AVAILABLE' };

  page = 1;
  pageSize = 10;

  totalBeds = 0;
  availableBeds = 0;
  occupiedBeds = 0;
  maintenanceBeds = 0;

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private dashSvc: DashboardService,
    private admin: AdminService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (!user) { this.loading = false; return; }

    this.dashSvc.getAllDoctors().subscribe({
      next: (doctors) => {
        const doc = doctors.find(d => d.user?.userId === user.userId);
        if (doc?.hospital) {
          this.hospitalId = doc.hospital.hospitalId;
          this.hospitalName = doc.hospital.hospitalName;
          this.loadBeds();
        } else {
          this.error = 'No hospital assigned to your account.';
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'Failed to load doctor info.';
        this.loading = false;
      }
    });
  }

  private loadBeds(): void {
    if (!this.hospitalId) return;
    this.admin.getBedsByHospital(this.hospitalId).subscribe({
      next: (beds) => {
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

  applyFilter(): void {
    let result = [...this.allBeds];
    if (this.statusFilter) result = result.filter(b => b.status?.toUpperCase() === this.statusFilter);
    if (this.wardFilter) result = result.filter(b => b.ward === this.wardFilter);
    this.filtered = result;
    this.totalBeds = result.length;
    this.availableBeds = result.filter(b => b.status?.toUpperCase() === 'AVAILABLE').length;
    this.occupiedBeds = result.filter(b => b.status?.toUpperCase() === 'OCCUPIED').length;
    this.maintenanceBeds = result.filter(b => b.status?.toUpperCase() === 'MAINTENANCE').length;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get paged(): AdminBed[] {
    const s = (this.page - 1) * this.pageSize;
    return this.filtered.slice(s, s + this.pageSize);
  }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.page = p; }

  openAdd(): void {
    this.form = { ward: '', bedNumber: '', status: 'AVAILABLE' };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(b: AdminBed): void {
    this.form = { ward: b.ward, bedNumber: String(b.bedNumber), status: b.status };
    this.editingId = b.bedId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.saveError = ''; }

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
      hospital: this.hospitalId ? { hospitalId: this.hospitalId } : null
    };

    const req = this.editingId !== null
      ? this.admin.updateBed(this.editingId, payload)
      : this.admin.createBed(payload);

    req.subscribe({
      next: (result) => {
        this.saving = false;
        if (result) {
          this.showModal = false;
          this.loadBeds();
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

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void { this.deleteConfirmId = null; }

  doDelete(id: number): void {
    this.admin.deleteBed(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadBeds(); },
      error: () => { this.deleteConfirmId = null; }
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
