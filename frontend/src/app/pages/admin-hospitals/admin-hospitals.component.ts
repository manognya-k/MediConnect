import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../services/layout.service';
import { AdminService, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-hospitals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-hospitals.component.html',
  styleUrls: ['./admin-hospitals.component.scss']
})
export class AdminHospitalsComponent implements OnInit {
  hospitals: Hospital[] = [];
  filtered: Hospital[] = [];
  searchQuery = '';
  loading = true;
  error = '';
  showModal = false;
  saving = false;
  saveError = '';
  editingId: number | null = null;
  form = { hospitalName: '', city: '', address: '', phone: '', email: '' };
  deleteConfirmId: number | null = null;

  constructor(
    public layout: LayoutService,
    private svc: AdminService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getHospitals().subscribe({
      next: (data) => {
        this.hospitals = data;
        this.filtered = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load hospitals.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filtered = this.hospitals;
      return;
    }
    this.filtered = this.hospitals.filter(h =>
      (h.hospitalName || '').toLowerCase().includes(q) ||
      (h.city || '').toLowerCase().includes(q)
    );
  }

  openAdd(): void {
    this.form = { hospitalName: '', city: '', address: '', phone: '', email: '' };
    this.editingId = null;
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(h: Hospital): void {
    this.form = {
      hospitalName: h.hospitalName || '',
      city: h.city || '',
      address: h.address || '',
      phone: h.phone || '',
      email: h.email || ''
    };
    this.editingId = h.hospitalId;
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
  }

  save(): void {
    if (!this.form.hospitalName.trim()) {
      this.saveError = 'Hospital name is required.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const obs = this.editingId !== null
      ? this.svc.updateHospital(this.editingId, this.form)
      : this.svc.createHospital(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.saveError = 'Failed to save. Please try again.';
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
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.svc.deleteHospital(id).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.load();
      },
      error: () => {
        this.deleteConfirmId = null;
      }
    });
  }
}
