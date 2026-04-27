import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { AdminService, AdminPatient, Hospital } from '../../services/admin.service';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-patients.component.html',
  styleUrls: ['./admin-patients.component.scss']
})
export class AdminPatientsComponent implements OnInit {
  allPatients: AdminPatient[] = [];
  filtered: AdminPatient[] = [];
  hospitals: Hospital[] = [];

  searchQuery = '';
  bloodGroupFilter = '';
  genderFilter = '';

  loading = true;
  error = '';

  page = 1;
  pageSize = 10;

  selectedPatient: AdminPatient | null = null;
  showDetail = false;

  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  readonly avatarBg = ['#EBF3FC', '#EAF3DE', '#FBEAF0', '#E1F5EE'];
  readonly avatarText = ['#185FA5', '#3B6D11', '#993556', '#0F6E56'];

  constructor(public layout: LayoutService, private svc: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      hospitals: this.svc.getHospitals(),
      patients: this.svc.getPatients()
    }).subscribe({
      next: ({ hospitals, patients }) => {
        this.hospitals = hospitals;
        this.allPatients = patients;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    let result = [...this.allPatients];

    if (this.bloodGroupFilter) {
      result = result.filter(p => p.bloodGroup === this.bloodGroupFilter);
    }

    if (this.genderFilter) {
      result = result.filter(
        p => (p.gender || '').toLowerCase() === this.genderFilter.toLowerCase()
      );
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(
        p =>
          p.user.name.toLowerCase().includes(q) ||
          p.user.email.toLowerCase().includes(q) ||
          (p.user.phone || '').toLowerCase().includes(q)
      );
    }

    this.filtered = result;
  }

  onSearch(): void {
    this.page = 1;
    this.applyFilter();
  }

  openDetail(p: AdminPatient): void {
    this.selectedPatient = p;
    this.showDetail = true;
  }

  closeDetail(): void {
    this.showDetail = false;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AdminPatient[] {
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

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatDate(d: string | undefined): string {
    return this.svc.formatDate(d);
  }

  getAge(dob: string | undefined): string {
    if (!dob) return '—';
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} yrs` : '—';
  }

  getHospitalForPatient(_p: AdminPatient): string {
    return '—';
  }

  getAvatarBg(index: number): string {
    return this.avatarBg[index % this.avatarBg.length];
  }

  getAvatarColor(index: number): string {
    return this.avatarText[index % this.avatarText.length];
  }
}
