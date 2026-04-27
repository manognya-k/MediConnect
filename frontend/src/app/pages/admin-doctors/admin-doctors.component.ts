import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminDoctor, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-doctors.component.html',
  styleUrls: ['./admin-doctors.component.scss']
})
export class AdminDoctorsComponent implements OnInit {
  allDoctors: AdminDoctor[] = [];
  filtered: AdminDoctor[] = [];
  hospitals: Hospital[] = [];

  searchQuery = '';
  hospitalFilter = '';
  statusFilter = '';

  loading = true;
  error = '';

  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;

  deleteConfirmId: number | null = null;

  form = {
    name: '',
    email: '',
    phone: '',
    specialization: '',
    availabilityStatus: 'AVAILABLE',
    hospitalId: ''
  };

  page = 1;
  pageSize = 10;

  readonly avatarBg = ['#EBF3FC', '#EAF3DE', '#FBEAF0', '#E1F5EE'];
  readonly avatarText = ['#185FA5', '#3B6D11', '#993556', '#0F6E56'];

  constructor(public layout: LayoutService, private svc: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.svc.getHospitals(),
      doctors: this.svc.getDoctors()
    }).subscribe({
      next: ({ hospitals, doctors }) => {
        this.hospitals = hospitals;
        this.allDoctors = doctors;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  private loadDoctors(): void {
    this.svc.getDoctors().subscribe({
      next: (doctors) => {
        this.allDoctors = doctors;
        this.applyFilter();
      },
      error: () => {
        this.error = 'Failed to reload doctors.';
      }
    });
  }

  applyFilter(): void {
    let result = [...this.allDoctors];

    if (this.hospitalFilter) {
      result = result.filter(
        d => String(d.hospital?.hospitalId) === String(this.hospitalFilter)
      );
    }

    if (this.statusFilter) {
      result = result.filter(
        d => this.svc.normalizeStatus(d.availabilityStatus) === this.statusFilter
      );
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(
        d =>
          d.user.name.toLowerCase().includes(q) ||
          d.user.email.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q)
      );
    }

    this.filtered = result;
  }

  onSearch(): void {
    this.page = 1;
    this.applyFilter();
  }

  openAdd(): void {
    this.form = {
      name: '',
      email: '',
      phone: '',
      specialization: '',
      availabilityStatus: 'AVAILABLE',
      hospitalId: ''
    };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(d: AdminDoctor): void {
    this.form = {
      name: d.user.name,
      email: d.user.email,
      phone: d.user.phone || '',
      specialization: d.specialization,
      availabilityStatus: d.availabilityStatus,
      hospitalId: String(d.hospital?.hospitalId || '')
    };
    this.editingId = d.doctorId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
  }

  save(): void {
    this.saving = true;
    this.saveError = '';

    const payload = {
      specialization: this.form.specialization,
      availabilityStatus: this.form.availabilityStatus,
      hospital: this.form.hospitalId ? { hospitalId: Number(this.form.hospitalId) } : null,
      user: {
        name: this.form.name,
        email: this.form.email,
        phone: this.form.phone
      }
    };

    const op = this.editingId
      ? this.svc.updateDoctor(this.editingId, payload)
      : this.svc.createDoctor(payload);

    op.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.loadDoctors();
      },
      error: () => {
        this.saving = false;
        this.saveError = 'Failed to save doctor.';
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(): void {
    if (this.deleteConfirmId == null) return;
    this.svc.deleteDoctor(this.deleteConfirmId).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.loadDoctors();
      },
      error: () => {
        this.deleteConfirmId = null;
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AdminDoctor[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getStatusClass(s: string): string {
    const n = this.svc.normalizeStatus(s);
    if (n === 'AVAILABLE') return 'badge-available';
    if (n === 'UNAVAILABLE') return 'badge-unavailable';
    return 'badge-default';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getHospitalName(d: AdminDoctor): string {
    return d.hospital?.hospitalName || '—';
  }

  getAvatarBg(index: number): string {
    return this.avatarBg[index % this.avatarBg.length];
  }

  getAvatarColor(index: number): string {
    return this.avatarText[index % this.avatarText.length];
  }

  getDoctorForDelete(): AdminDoctor | undefined {
    return this.allDoctors.find(d => d.doctorId === this.deleteConfirmId);
  }
}
