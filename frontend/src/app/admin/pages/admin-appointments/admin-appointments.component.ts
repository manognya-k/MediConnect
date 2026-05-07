import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminAppointmentsService } from '../../services/admin-appointments.service';
import { ToastService } from '../../../services/toast.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-appointments.component.html',
  styleUrl: './admin-appointments.component.scss'
})
export class AdminAppointmentsComponent implements OnInit, OnDestroy {
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  stats: any = {};
  searchTerm = '';
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  private destroy$ = new Subject<void>();

  calDays = Array.from({length: 30}, (_, i) => i + 1);

  // View appointment detail
  viewingAppt: any = null;

  // Approve
  approvingId: number | null = null;

  // New Appointment modal
  showNewAppt = false;
  newApptForm!: FormGroup;
  newApptSubmitting = false;
  allDoctors:   any[] = [];
  allHospitals: any[] = [];
  allPatients:  any[] = [];

  constructor(
    private svc: AdminAppointmentsService,
    private toast: ToastService,
    private fb: FormBuilder,
    public notifSvc: AdminNotificationService
  ) {}

  ngOnInit() {
    this.buildNewApptForm();
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ appointments, stats }) => {
        this.appointments = appointments;
        this.filteredAppointments = appointments.slice(0, 20);
        this.stats = stats;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredAppointments = this.appointments.filter(a =>
      this.patientName(a).toLowerCase().includes(t) ||
      this.doctorName(a).toLowerCase().includes(t) ||
      a.status?.toLowerCase().includes(t)
    ).slice(0, 20);
  }

  // ── Display helpers ───────────────────────────────────────────────────────────

  /** Extracts patient name from nested JPA structure */
  patientName(a: any): string {
    return a.patient?.user?.name ?? a.patientName ?? '—';
  }

  /** Extracts doctor name from nested JPA structure */
  doctorName(a: any): string {
    return a.doctor?.user?.name ?? a.doctorName ?? '—';
  }

  /** Patient code like PT-0021 */
  patientCode(a: any): string {
    const id = a.patient?.patientId ?? a.patientId;
    return id ? `PT-${String(id).padStart(4, '0')}` : '';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = { 'CONFIRMED': 'b-green', 'PENDING': 'b-amber', 'CANCELLED': 'b-red', 'COMPLETED': 'b-teal' };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  getTypeBadge(type: string): string {
    return type?.toUpperCase() === 'VIDEO' ? 'b-blue' : 'b-sub';
  }

  // ── View ─────────────────────────────────────────────────────────────────────

  viewAppointment(a: any) { this.viewingAppt = a; }
  closeView() { this.viewingAppt = null; }

  // ── Approve ───────────────────────────────────────────────────────────────────

  approveAppointment(a: any) {
    if (this.approvingId) return;
    this.approvingId = a.appointmentId;
    this.svc.approve(a.appointmentId, a).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.approvingId = null;
        this.toast.show('Appointment approved successfully.', 'success');
        const patch = (list: any[]) => list.map(x =>
          x.appointmentId === a.appointmentId ? { ...x, status: 'CONFIRMED' } : x
        );
        this.appointments = patch(this.appointments);
        this.filteredAppointments = patch(this.filteredAppointments);
        if (this.viewingAppt?.appointmentId === a.appointmentId) {
          this.viewingAppt = { ...this.viewingAppt, status: 'CONFIRMED' };
        }
      },
      error: () => {
        this.approvingId = null;
        this.toast.show('Failed to approve appointment.', 'error');
      }
    });
  }

  // ── New Appointment ───────────────────────────────────────────────────────────

  buildNewApptForm() {
    this.newApptForm = this.fb.group({
      patientId:  [null, Validators.required],
      doctorId:   [null, Validators.required],
      hospitalId: [null],
      date:       ['', Validators.required],
      time:       ['', Validators.required],
      type:       ['IN_PERSON', Validators.required],
      notes:      [''],
    });
  }

  openNewAppt() {
    this.newApptForm.reset({ type: 'IN_PERSON' });
    this.showNewAppt = true;
    if (!this.allPatients.length) {
      this.svc.getPatients().pipe(takeUntil(this.destroy$)).subscribe(p => this.allPatients = p);
    }
    if (!this.allDoctors.length) {
      this.svc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe(d => this.allDoctors = d);
    }
    if (!this.allHospitals.length) {
      this.svc.getHospitals().pipe(takeUntil(this.destroy$)).subscribe(h => this.allHospitals = h);
    }
  }

  closeNewAppt() { this.showNewAppt = false; }

  submitNewAppt() {
    if (this.newApptForm.invalid) { this.newApptForm.markAllAsTouched(); return; }
    this.newApptSubmitting = true;
    const v = this.newApptForm.value;
    const body = {
      patient:         { patientId: +v.patientId },
      doctor:          { doctorId:  +v.doctorId },
      hospital:        v.hospitalId ? { hospitalId: +v.hospitalId } : null,
      appointmentDate: v.date,
      appointmentTime: v.time + ':00',
      appointmentType: v.type,
      status:          'PENDING',
      notes:           v.notes || '',
    };
    this.svc.create(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newApptSubmitting = false;
        this.closeNewAppt();
        this.toast.show('Appointment created successfully.', 'success');
        this.svc.getAllData().pipe(takeUntil(this.destroy$)).subscribe(({ appointments, stats }) => {
          this.appointments = appointments;
          this.filteredAppointments = appointments.slice(0, 20);
          this.stats = stats;
        });
      },
      error: () => {
        this.newApptSubmitting = false;
        this.toast.show('Failed to create appointment.', 'error');
      }
    });
  }

  hasError(form: FormGroup, field: string, err: string): boolean {
    const c = form.get(field);
    return !!(c?.touched && c.hasError(err));
  }

  formatPatientCode(id: number): string {
    return 'PT-' + String(id).padStart(4, '0');
  }

  get totalToday() { return this.stats.total || this.appointments.length; }
  get confirmed()  { return this.stats.confirmed || 0; }
  get pending()    { return this.stats.pending || 0; }
  get cancelled()  { return this.stats.cancelled || 0; }
}
