import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { PatientPortalService } from '../../services/patient-portal.service';
import { BackendPatient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.scss'
})
export class PatientProfileComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  patientInfo: BackendPatient | null = null;

  loading = true;
  error = '';
  saving = false;
  saveSuccess = false;
  saveError = '';

  showEditModal = false;

  editForm = {
    address: '',
    emergencyContact: '',
    bloodGroup: '',
    gender: '',
    dateOfBirth: ''
  };

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private portalService: PatientPortalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    if (!this.currentUser) { this.router.navigate(['/login']); return; }
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    this.portalService.getAllPatients().subscribe({
      next: (patients) => {
        this.patientInfo = patients.find(p => p.user?.userId === this.currentUser?.userId) || null;
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load profile'; this.loading = false; }
    });
  }

  openEdit() {
    if (!this.patientInfo) return;
    this.editForm = {
      address: this.patientInfo.address || '',
      emergencyContact: this.patientInfo.emergencyContact || '',
      bloodGroup: this.patientInfo.bloodGroup || '',
      gender: this.patientInfo.gender || '',
      dateOfBirth: this.patientInfo.dateOfBirth || this.patientInfo.user?.dateOfBirth || ''
    };
    this.saveError = '';
    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
    this.saveError = '';
  }

  saveProfile() {
    if (!this.patientInfo) return;
    this.saving = true;
    this.saveError = '';

    this.portalService.updatePatient(this.patientInfo.patientId, {
      ...this.patientInfo,
      address: this.editForm.address,
      emergencyContact: this.editForm.emergencyContact,
      bloodGroup: this.editForm.bloodGroup,
      gender: this.editForm.gender,
      dateOfBirth: this.editForm.dateOfBirth || undefined
    }).subscribe({
      next: (updated) => {
        if (updated) {
          this.patientInfo = updated;
        }
        this.saving = false;
        this.showEditModal = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 3000);
      },
      error: () => {
        this.saveError = 'Failed to save changes. Please try again.';
        this.saving = false;
      }
    });
  }

  getInitials(): string {
    const name = this.patientInfo?.user?.name || this.currentUser?.name || 'P';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  getAge(): number {
    return this.portalService.getAge(this.patientInfo?.dateOfBirth || this.patientInfo?.user?.dateOfBirth);
  }

  formatDate(d: string | undefined) { return this.portalService.formatDate(d); }

  get patientCode(): string {
    return 'PT-' + String(this.patientInfo?.patientId || 0).padStart(4, '0');
  }
}
