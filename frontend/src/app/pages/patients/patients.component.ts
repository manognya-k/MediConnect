import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { PatientService, PagedResult } from '../../services/patient.service';
import { Patient, PatientStats, PatientFilter } from '../../models/patient.model';
import { LayoutService } from '../../services/layout.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { PatientFormComponent } from './patient-form/patient-form.component';
import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form.component';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, PatientFormComponent, AppointmentFormComponent],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss'
})
export class PatientsComponent implements OnInit, OnDestroy {
  patients: Patient[] = [];
  stats: PatientStats = { total: 0, activeThisWeek: 0, criticalCases: 0, newThisMonth: 0, totalToday: 0, increasePercent: 12.5 };

  filter: PatientFilter = { page: 1, pageSize: 10, search: '', gender: '', bloodGroup: '', status: '' };
  total = 0;
  totalPages = 0;
  pageNumbers: (number | '…')[] = [];

  loading = true;
  error = '';

  showForm = false;
  editPatient: Patient | null = null;

  showScheduleForm = false;
  schedulingPatient: Patient | null = null;
  doctorId: number | null = null;
  hospitalId: number | null = null;

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  readonly avatarColors = [
    { bg: '#EBF3FC', color: '#185FA5' },
    { bg: '#EAF3DE', color: '#3B6D11' },
    { bg: '#FEF3CD', color: '#854F0B' },
    { bg: '#FBEAF0', color: '#993556' },
    { bg: '#E1F5EE', color: '#0F6E56' },
    { bg: '#F1EFE8', color: '#5F5E5A' },
  ];

  constructor(
    public layout: LayoutService,
    private patientService: PatientService,
    private toastService: ToastService,
    private router: Router,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(v => {
      this.filter = { ...this.filter, search: v, page: 1 };
      this.load();
    });

    const user = this.auth.getUser();
    if (user) {
      this.dashSvc.getAllDoctors().subscribe({
        next: (doctors) => {
          const doc = doctors.find(d => d.user?.userId === user.userId);
          if (doc) {
            this.doctorId = doc.doctorId;
            this.hospitalId = doc.hospital?.hospitalId ?? null;
            if (this.hospitalId) {
              this.patientService.getPatientsByHospital(this.hospitalId).subscribe({
                next: (hosPts) => {
                  if (hosPts.length > 0) {
                    const ids = hosPts.map(p => p.rawId);
                    this.filter = { ...this.filter, patientIds: ids };
                  } else {
                    const apptFallback = this.dashSvc.getAppointmentsByDoctor(doc.doctorId);
                    apptFallback.subscribe({
                      next: (appts) => {
                        const ids = [...new Set(
                          appts.filter(a => a.patient?.patientId).map(a => a.patient!.patientId)
                        )];
                        if (ids.length > 0) this.filter = { ...this.filter, patientIds: ids };
                      }
                    });
                  }
                  this.load();
                },
                error: () => this.load()
              });
            } else {
              this.load();
            }
          } else {
            this.load();
          }
        },
        error: () => this.load()
      });
    } else {
      this.load();
    }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true;
    this.error = '';
    this.patientService.getPatients(this.filter).subscribe({
      next: (res) => {
        this.patients = res.data;
        this.total = res.total;
        this.totalPages = Math.ceil(res.total / this.filter.pageSize);
        this.buildPageNumbers();

        if (this.stats.total === 0) {
          this.patientService.getPatients({ ...this.filter, page: 1, pageSize: 99999, search: '', gender: '', bloodGroup: '', status: '' }).subscribe(all => {
            this.stats = this.patientService.getStats(all.data);
          });
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load patients. Please check the server connection.';
        this.loading = false;
      }
    });
  }

  onSearchInput(v: string) { this.search$.next(v); }

  onFilterChange() {
    this.filter = { ...this.filter, page: 1 };
    this.load();
  }

  goToPage(p: number | '…') {
    if (p === '…' || p === this.filter.page) return;
    this.filter = { ...this.filter, page: p as number };
    this.load();
  }

  prevPage() { if (this.filter.page > 1) { this.filter = { ...this.filter, page: this.filter.page - 1 }; this.load(); } }
  nextPage() { if (this.filter.page < this.totalPages) { this.filter = { ...this.filter, page: this.filter.page + 1 }; this.load(); } }

  private buildPageNumbers() {
    const total = this.totalPages;
    const cur = this.filter.page;
    if (total <= 7) {
      this.pageNumbers = Array.from({ length: total }, (_, i) => i + 1);
      return;
    }
    const pages: (number | '…')[] = [1];
    if (cur > 3) pages.push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('…');
    pages.push(total);
    this.pageNumbers = pages;
  }

  get showStart() { return (this.filter.page - 1) * this.filter.pageSize + 1; }
  get showEnd() { return Math.min(this.filter.page * this.filter.pageSize, this.total); }

  avatarStyle(index: number): { background: string; color: string } {
    const c = this.avatarColors[index % this.avatarColors.length];
    return { background: c.bg, color: c.color };
  }

  bloodBadgeClass(bg: string): string {
    return bg === 'O-' || bg === 'B-' ? 'b-red' : 'b-blue';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = { Active: 'b-green', Monitoring: 'b-amber', Critical: 'b-red', Inactive: 'b-gray' };
    return m[s] || 'b-gray';
  }

  viewPatient(id: string) { this.router.navigate(['/doctor/patients', id]); }

  openAddForm() { this.editPatient = null; this.showForm = true; }
  openEditForm(p: Patient, event: Event) { event.stopPropagation(); this.editPatient = p; this.showForm = true; }
  closeForm() { this.showForm = false; this.editPatient = null; }

  openScheduleForm(p: Patient, event: Event) {
    event.stopPropagation();
    this.schedulingPatient = p;
    this.showScheduleForm = true;
  }

  onFormSaved() {
    this.closeForm();
    this.stats = { ...this.stats, total: 0 };
    this.load();
    this.toastService.show(this.editPatient ? 'Patient updated.' : 'Patient added successfully.', 'success');
  }

  onAppointmentScheduled() {
    this.showScheduleForm = false;
    this.schedulingPatient = null;
    this.toastService.show('Appointment scheduled successfully.', 'success');
  }
}
