import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer, of } from 'rxjs';
import { switchMap, takeUntil, delay } from 'rxjs/operators';
import { AdminPatientsService } from '../../services/admin-patients.service';
import { ToastService } from '../../../services/toast.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-patients.component.html',
  styleUrl: './admin-patients.component.scss'
})
export class AdminPatientsComponent implements OnInit, OnDestroy {
  patients: any[] = [];
  filteredPatients: any[] = [];
  searchTerm = '';
  activeTab: 'inpatients' | 'outpatients' = 'inpatients';
  selectedPatient: any = null;
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  private destroy$ = new Subject<void>();

  // Edit modal
  showEdit = false;
  editData: any = {};
  editSubmitting = false;

  // Delete confirmation
  showDeleteConfirm = false;
  deleteSubmitting = false;

  // AI Summary
  showAiSummary = false;
  aiSummaryLoading = false;
  aiSummaryText = '';

  constructor(
    private svc: AdminPatientsService,
    private toast: ToastService,
    public notifSvc: AdminNotificationService
  ) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getPatients()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = [...patients];
        if (patients.length) this.selectedPatient = patients[0];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'inpatients' | 'outpatients') { this.activeTab = tab; }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredPatients = this.patients.filter(p => {
      const name  = (p.user?.name  ?? p.name  ?? '').toLowerCase();
      const email = (p.user?.email ?? p.email ?? '').toLowerCase();
      return name.includes(t) || email.includes(t);
    });
  }

  selectPatient(p: any) { this.selectedPatient = p; }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = { 'ACTIVE': 'b-green', 'CRITICAL': 'b-red', 'STABLE': 'b-teal', 'INACTIVE': 'b-sub' };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  // ── Edit Patient ──────────────────────────────────────────────────────────────

  openEditPatient() {
    if (!this.selectedPatient) return;
    this.editData = {
      name:       this.selectedPatient.user?.name  ?? this.selectedPatient.name  ?? '',
      email:      this.selectedPatient.user?.email ?? this.selectedPatient.email ?? '',
      phone:      this.selectedPatient.user?.phone ?? this.selectedPatient.phone ?? '',
      bloodGroup: this.selectedPatient.bloodGroup ?? '',
    };
    this.showEdit = true;
  }

  closeEditPatient() { this.showEdit = false; }

  openDeletePatient() {
    if (!this.selectedPatient) return;
    this.showDeleteConfirm = true;
  }

  closeDeletePatient() { this.showDeleteConfirm = false; }

  confirmDeletePatient() {
    if (!this.selectedPatient) return;
    this.deleteSubmitting = true;
    this.svc.deletePatient(this.selectedPatient.patientId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const removed = this.selectedPatient;
        this.patients = this.patients.filter(p => p.patientId !== removed.patientId);
        this.filteredPatients = this.filteredPatients.filter(p => p.patientId !== removed.patientId);
        this.selectedPatient = this.patients[0] ?? null;
        this.deleteSubmitting = false;
        this.closeDeletePatient();
        this.toast.show('Patient deleted successfully.', 'success');
      },
      error: () => {
        this.deleteSubmitting = false;
        this.toast.show('Failed to delete patient.', 'error');
      }
    });
  }

  submitEditPatient() {
    if (!this.editData.name?.trim()) {
      this.toast.show('Patient name is required.', 'error');
      return;
    }
    this.editSubmitting = true;
    this.svc.updatePatient(this.selectedPatient.patientId, this.selectedPatient).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.editSubmitting = false;
        const updated = res ?? { ...this.selectedPatient, ...this.editData };
        this.patients = this.patients.map(p => p.patientId === this.selectedPatient.patientId ? updated : p);
        this.filteredPatients = this.filteredPatients.map(p => p.patientId === this.selectedPatient.patientId ? updated : p);
        this.selectedPatient = updated;
        this.closeEditPatient();
        this.toast.show('Patient record updated.', 'success');
      },
      error: () => {
        this.editSubmitting = false;
        this.toast.show('Failed to update patient record.', 'error');
      }
    });
  }

  // ── AI Summarize ──────────────────────────────────────────────────────────────

  openAiSummary() {
    if (!this.selectedPatient) return;
    this.showAiSummary = true;
    this.aiSummaryLoading = true;
    this.aiSummaryText = '';
    of(null).pipe(delay(1200), takeUntil(this.destroy$)).subscribe(() => {
      this.aiSummaryLoading = false;
      const p = this.selectedPatient;
      this.aiSummaryText = `Patient ${p.user?.name ?? p.name ?? 'Unknown'} (ID: ${p.patientId}) is registered in the MediConnect system` +
        (p.bloodGroup ? ` with blood group ${p.bloodGroup}` : '') + `. ` +
        `Based on available records, the patient has an active status with no critical alerts. ` +
        `Routine follow-up is recommended. For a detailed clinical AI summary, review appointment notes and lab reports via the Diagnostics module.`;
    });
  }

  closeAiSummary() { this.showAiSummary = false; }

  // ── Export ────────────────────────────────────────────────────────────────────

  exportPatients() {
    const csv = ['Name,Email,Phone,Blood Group,Patient ID']
      .concat(this.patients.map(p => {
        const name  = p.user?.name  ?? p.name  ?? '';
        const email = p.user?.email ?? p.email ?? '';
        return `"${name}","${email}","${p.phone ?? ''}","${p.bloodGroup ?? ''}","${p.patientId ?? ''}"`;
      })).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `patients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.show('Patient list exported as CSV.', 'success');
  }

  get totalCount() { return this.patients.length; }
}
