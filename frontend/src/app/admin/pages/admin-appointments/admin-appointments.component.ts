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
  private destroy$ = new Subject<void>();

  // ── Calendar ─────────────────────────────────────────────────────────────────
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();   // 0-indexed
  calDays: number[] = [];
  calStartOffset = 0;
  calendarSummary = new Map<number, number>();
  selectedDate: number | null = null;
  selectedDateAppts: any[] = [];

  get calMonthLabel(): string {
    return new Date(this.calYear, this.calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get calOffsetSlots(): number[] {
    return Array(this.calStartOffset).fill(0);
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  filterDoctorId   = '';
  filterHospitalId = '';
  filterDate       = '';
  uniqueDoctors:   { id: string; name: string }[] = [];
  uniqueHospitals: { id: string; name: string }[] = [];

  // ── Reschedule requests ───────────────────────────────────────────────────────
  rescheduleRequests: any[] = [];
  processingRescheduleId: number | null = null;

  get pendingRescheduleCount(): number {
    return this.rescheduleRequests.filter(r => r.status === 'PENDING').length;
  }

  // ── View / Approve ────────────────────────────────────────────────────────────
  viewingAppt: any = null;
  approvingId: number | null = null;

  // ── New Appointment modal ─────────────────────────────────────────────────────
  showNewAppt       = false;
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
        this.stats        = stats;
        this.isLoading    = false;
        this.buildCalendar();
        this.buildFilterOptions();
        this.applyFilters();
      },
      error: () => { this.isLoading = false; }
    });

    this.loadRescheduleRequests();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Reschedule requests ───────────────────────────────────────────────────────

  loadRescheduleRequests(): void {
    this.svc.getRescheduleRequests().pipe(takeUntil(this.destroy$)).subscribe(r => {
      this.rescheduleRequests = r;
    });
  }

  forwardReschedule(req: any): void {
    this.processingRescheduleId = req.id;
    this.svc.forwardReschedule(req.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.processingRescheduleId = null;
        this.toast.show('Request forwarded to doctor for confirmation.', 'success');
        this.loadRescheduleRequests();
      },
      error: () => {
        this.processingRescheduleId = null;
        this.toast.show('Failed to forward request.', 'error');
      }
    });
  }

  rejectReschedule(req: any): void {
    this.processingRescheduleId = req.id;
    this.svc.rejectReschedule(req.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.processingRescheduleId = null;
        this.toast.show('Reschedule request rejected.', 'success');
        this.loadRescheduleRequests();
      },
      error: () => {
        this.processingRescheduleId = null;
        this.toast.show('Failed to reject request.', 'error');
      }
    });
  }

  getRescheduleBadge(status: string): string {
    const map: Record<string, string> = { PENDING: 'b-amber', FORWARDED: 'b-blue', ACCEPTED: 'b-green', REJECTED: 'b-red' };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  // ── Calendar ──────────────────────────────────────────────────────────────────

  private buildCalendar(): void {
    const days = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    this.calDays = Array.from({ length: days }, (_, i) => i + 1);
    // Mon = 0 … Sun = 6; JS getDay() returns Sun = 0, so rotate
    this.calStartOffset = (new Date(this.calYear, this.calMonth, 1).getDay() + 6) % 7;

    const summary = new Map<number, number>();
    const m = this.calMonth + 1; // 1-indexed
    for (const a of this.appointments) {
      const day = this.apptDay(a, this.calYear, m);
      if (day) summary.set(day, (summary.get(day) ?? 0) + 1);
    }
    this.calendarSummary = summary;

    // Keep selectedDate appointments in sync after reload
    if (this.selectedDate) this.onDateSelect(this.selectedDate);
  }

  onDateSelect(day: number): void {
    this.selectedDate = day;
    const m = this.calMonth + 1;
    this.selectedDateAppts = this.appointments.filter(a => this.apptDay(a, this.calYear, m) === day);
  }

  clearDateSelection(): void {
    this.selectedDate     = null;
    this.selectedDateAppts = [];
  }

  prevMonth(): void {
    if (this.calMonth === 0) { this.calYear--; this.calMonth = 11; }
    else this.calMonth--;
    this.clearDateSelection();
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.calMonth === 11) { this.calYear++; this.calMonth = 0; }
    else this.calMonth++;
    this.clearDateSelection();
    this.buildCalendar();
  }

  /** Returns the day-of-month if the appointment matches the given year/month, else null. */
  private apptDay(a: any, year: number, month: number): number | null {
    const d = a.appointmentDate;
    if (Array.isArray(d) && d[0] === year && d[1] === month) return d[2];
    if (typeof d === 'string') {
      const p = d.split('-');
      if (+p[0] === year && +p[1] === month) return +p[2];
    }
    return null;
  }

  // ── Filters ───────────────────────────────────────────────────────────────────

  private buildFilterOptions(): void {
    const doctorMap   = new Map<string, string>();
    const hospitalMap = new Map<string, string>();
    for (const a of this.appointments) {
      const did = String(a.doctor?.doctorId   ?? '');
      if (did) doctorMap.set(did,   a.doctor?.user?.name      ?? 'Doctor');
      const hid = String(a.hospital?.hospitalId ?? '');
      if (hid) hospitalMap.set(hid, a.hospital?.hospitalName  ?? 'Hospital');
    }
    this.uniqueDoctors   = Array.from(doctorMap,   ([id, name]) => ({ id, name }));
    this.uniqueHospitals = Array.from(hospitalMap, ([id, name]) => ({ id, name }));
  }

  applyFilters(): void {
    let list = [...this.appointments];

    if (this.filterDoctorId)
      list = list.filter(a => String(a.doctor?.doctorId   ?? '') === this.filterDoctorId);

    if (this.filterHospitalId)
      list = list.filter(a => String(a.hospital?.hospitalId ?? '') === this.filterHospitalId);

    if (this.filterDate) {
      list = list.filter(a => {
        const d = a.appointmentDate;
        if (Array.isArray(d)) {
          const iso = `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
          return iso === this.filterDate;
        }
        return String(d) === this.filterDate;
      });
    }

    const t = this.searchTerm.toLowerCase();
    if (t) {
      list = list.filter(a =>
        this.patientName(a).toLowerCase().includes(t) ||
        this.doctorName(a).toLowerCase().includes(t)  ||
        (a.status ?? '').toLowerCase().includes(t)
      );
    }

    this.filteredAppointments = list;
  }

  clearFilters(): void {
    this.filterDoctorId   = '';
    this.filterHospitalId = '';
    this.filterDate       = '';
    this.searchTerm       = '';
    this.applyFilters();
  }

  search(): void { this.applyFilters(); }

  // ── Display helpers ───────────────────────────────────────────────────────────

  patientName(a: any): string { return a.patient?.user?.name ?? a.patientName ?? '—'; }
  doctorName(a: any):  string { return a.doctor?.user?.name  ?? a.doctorName  ?? '—'; }

  patientCode(a: any): string {
    const id = a.patient?.patientId ?? a.patientId;
    return id ? `PT-${String(id).padStart(4, '0')}` : '';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      CONFIRMED: 'b-green', PENDING: 'b-amber', CANCELLED: 'b-red', COMPLETED: 'b-teal'
    };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  getTypeBadge(type: string): string { return type?.toUpperCase() === 'VIDEO' ? 'b-blue' : 'b-sub'; }

  // ── View / Approve ─────────────────────────────────────────────────────────────

  viewAppointment(a: any) { this.viewingAppt = a; }
  closeView()              { this.viewingAppt = null; }

  approveAppointment(a: any) {
    if (this.approvingId) return;
    this.approvingId = a.appointmentId;
    this.svc.approve(a.appointmentId, a).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.approvingId = null;
        this.toast.show('Appointment approved successfully.', 'success');
        const patch = (list: any[]) =>
          list.map(x => x.appointmentId === a.appointmentId ? { ...x, status: 'CONFIRMED' } : x);
        this.appointments         = patch(this.appointments);
        this.filteredAppointments = patch(this.filteredAppointments);
        if (this.viewingAppt?.appointmentId === a.appointmentId)
          this.viewingAppt = { ...this.viewingAppt, status: 'CONFIRMED' };
        this.buildCalendar();
      },
      error: () => {
        this.approvingId = null;
        this.toast.show('Failed to approve appointment.', 'error');
      }
    });
  }

  // ── New Appointment modal ──────────────────────────────────────────────────────

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
    // Always refresh patients + doctors so newly registered records appear (Fix 8)
    this.svc.getPatients().pipe(takeUntil(this.destroy$)).subscribe(p => this.allPatients = p);
    this.svc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe(d => this.allDoctors = d);
    if (!this.allHospitals.length)
      this.svc.getHospitals().pipe(takeUntil(this.destroy$)).subscribe(h => this.allHospitals = h);
  }

  closeNewAppt() { this.showNewAppt = false; }

  submitNewAppt() {
    if (this.newApptForm.invalid) { this.newApptForm.markAllAsTouched(); return; }
    this.newApptSubmitting = true;
    const v = this.newApptForm.value;
    const body = {
      patient:         { patientId: +v.patientId },
      doctor:          { doctorId:  +v.doctorId  },
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
          this.stats        = stats;
          this.buildCalendar();
          this.buildFilterOptions();
          this.applyFilters();
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

  formatPatientCode(id: number): string { return 'PT-' + String(id).padStart(4, '0'); }

  get totalToday() { return this.stats.total    || this.appointments.length; }
  get confirmed()  { return this.stats.confirmed || 0; }
  get pending()    { return this.stats.pending   || 0; }
  get cancelled()  { return this.stats.cancelled || 0; }
}
