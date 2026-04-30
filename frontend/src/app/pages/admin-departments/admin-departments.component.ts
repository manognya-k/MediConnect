import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, Department, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-departments.component.html',
  styleUrls: ['./admin-departments.component.scss']
})
export class AdminDepartmentsComponent implements OnInit {
  allDepartments: Department[] = [];
  filtered: Department[] = [];
  hospitals: Hospital[] = [];

  hospitalFilter = '';
  searchQuery = '';

  loading = true;
  error = '';

  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;
  deleteConfirmId: number | null = null;
  deleteError = '';

  form = { departmentName: '', hospitalId: '' };

  page = 1;
  pageSize = 10;

  constructor(public layout: LayoutService, private admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.admin.getHospitals(),
      departments: this.admin.getDepartments()
    }).subscribe({
      next: ({ hospitals, departments }) => {
        this.hospitals = hospitals;
        this.allDepartments = departments;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load departments.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    let result = [...this.allDepartments];
    if (this.hospitalFilter) {
      result = result.filter(d => d.hospital?.hospitalId === Number(this.hospitalFilter));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(d => d.departmentName.toLowerCase().includes(q));
    }
    this.filtered = result;
    this.page = 1;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get paged(): Department[] {
    const s = (this.page - 1) * this.pageSize;
    return this.filtered.slice(s, s + this.pageSize);
  }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.page = p; }

  openAdd(): void {
    this.form = { departmentName: '', hospitalId: this.hospitalFilter };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(d: Department): void {
    this.form = {
      departmentName: d.departmentName,
      hospitalId: d.hospital ? String(d.hospital.hospitalId) : ''
    };
    this.editingId = d.departmentId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.saveError = ''; }

  save(): void {
    if (!this.form.departmentName.trim()) {
      this.saveError = 'Department name is required.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload: Partial<Department> = {
      departmentName: this.form.departmentName.trim(),
      hospital: this.form.hospitalId ? { hospitalId: Number(this.form.hospitalId) } : undefined
    };

    const req = this.editingId !== null
      ? this.admin.updateDepartment(this.editingId, payload)
      : this.admin.createDepartment(payload);

    req.subscribe({
      next: (result) => {
        this.saving = false;
        if (result) {
          this.showModal = false;
          this.reload();
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

  confirmDelete(id: number): void { this.deleteConfirmId = id; this.deleteError = ''; }
  cancelDelete(): void { this.deleteConfirmId = null; this.deleteError = ''; }

  doDelete(id: number): void {
    this.admin.deleteDepartment(id).subscribe({
      next: (ok) => {
        if (ok) {
          this.deleteConfirmId = null;
          this.deleteError = '';
          this.reload();
        } else {
          this.deleteError = 'Cannot delete: doctors are assigned to this department.';
        }
      },
      error: () => {
        this.deleteError = 'Cannot delete: doctors are assigned to this department.';
      }
    });
  }

  private reload(): void {
    this.admin.getDepartments().subscribe({
      next: (depts) => { this.allDepartments = depts; this.applyFilter(); }
    });
  }
}
