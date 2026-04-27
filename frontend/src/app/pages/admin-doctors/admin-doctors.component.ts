import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminDoctor, Hospital, Department, DoctorCreateRequest } from '../../services/admin.service';

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
  departments: Department[] = [];

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

  form: {
    name: string;
    email: string;
    phone: string;
    password: string;
    specialization: string;
    availabilityStatus: string;
    hospitalId: string;
    departmentId: string;
  } = {
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    availabilityStatus: 'AVAILABLE',
    hospitalId: '',
    departmentId: ''
  };

  page = 1;
  pageSize = 10;

  readonly avatarBg = ['#EBF3FC', '#EAF3DE', '#FBEAF0', '#E1F5EE'];
  readonly avatarText = ['#185FA5', '#3B6D11', '#993556', '#0F6E56'];

  constructor(public layout: LayoutService, public svc: AdminService) {}

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
      result = result.filter(d => d.availabilityStatus === this.statusFilter);
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
      password: '',
      specialization: '',
      availabilityStatus: 'AVAILABLE',
      hospitalId: '',
      departmentId: ''
    };
    this.departments = [];
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(d: AdminDoctor): void {
    this.form = {
      name: d.user.name,
      email: d.user.email,
      phone: d.user.phone || '',
      password: '',
      specialization: d.specialization,
      availabilityStatus: d.availabilityStatus,
      hospitalId: String(d.hospital?.hospitalId || ''),
      departmentId: String(d.department?.departmentId || '')
    };
    this.departments = [];
    if (d.hospital?.hospitalId) {
      this.svc.getDepartmentsByHospital(d.hospital.hospitalId).subscribe({
        next: (deps) => { this.departments = deps; }
      });
    }
    this.editingId = d.doctorId;
    this.saveError = '';
    this.showModal = true;
  }

  onHospitalChange(): void {
    this.form.departmentId = '';
    this.departments = [];
    if (this.form.hospitalId) {
      this.svc.getDepartmentsByHospital(Number(this.form.hospitalId)).subscribe({
        next: (deps) => { this.departments = deps; }
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
  }

  save(): void {
    if (!this.form.name || !this.form.email || !this.form.specialization) {
      this.saveError = 'Name, email, and specialization are required.';
      return;
    }
    if (!this.editingId && !this.form.password) {
      this.saveError = 'Password is required for new doctors.';
      return;
    }
    if (!this.form.hospitalId) {
      this.saveError = 'Please select a hospital.';
      return;
    }

    this.saving = true;
    this.saveError = '';

    const payload: DoctorCreateRequest = {
      name: this.form.name,
      email: this.form.email,
      phone: this.form.phone,
      password: this.form.password,
      specialization: this.form.specialization,
      availabilityStatus: this.form.availabilityStatus,
      hospitalId: Number(this.form.hospitalId),
      departmentId: this.form.departmentId ? Number(this.form.departmentId) : null
    };

    const op = this.editingId
      ? this.svc.updateDoctorFull(this.editingId, payload)
      : this.svc.registerDoctor(payload);

    op.subscribe({
      next: (result) => {
        this.saving = false;
        if (!result) {
          this.saveError = 'Failed to save doctor. Email may already be registered.';
          return;
        }
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
    switch (s) {
      case 'AVAILABLE': return 'badge-available';
      case 'UNAVAILABLE': return 'badge-unavailable';
      case 'ON_LEAVE': return 'badge-leave';
      default: return 'badge-default';
    }
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

  getDepartmentName(d: AdminDoctor): string {
    return d.department?.departmentName || '—';
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
