import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';
import { PatientAppointmentCard, AppointmentTab, AppointmentTabCounts } from '../../models/patient-appointment.model';
import { ToastService } from '../../../services/toast.service';
import { PatientStateService } from '../../services/patient-state.service';


@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './patient-appointments.component.html',
  styleUrl: './patient-appointments.component.scss'
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private allCards: Record<AppointmentTab, PatientAppointmentCard[]> = {
    upcoming: [], past: [], cancelled: []
  };
  private rawMap: Record<string, any> = {};   // original backend objects for PUT

  // Tab state
  activeTab: AppointmentTab = 'upcoming';
  tabCounts: AppointmentTabCounts = { upcoming: 0, past: 0, cancelled: 0 };
  cards: PatientAppointmentCard[] = [];
  loading = true;
  tabLoading = false;
  error = '';

  // Join call
  joiningId: string | null = null;

  // Cancel confirm
  showCancelConfirm = false;
  cancelingAppt: PatientAppointmentCard | null = null;
  cancelSubmitting = false;

  // Reschedule modal
  showReschedule = false;
  reschedulingAppt: PatientAppointmentCard | null = null;
  rescheduleForm!: FormGroup;
  rescheduleSlots: string[] = [];
  rescheduleSlotsLoading = false;
  rescheduleSubmitting = false;

  // Notes panel
  showNotes = false;
  notesAppt: PatientAppointmentCard | null = null;
  notesLoading = false;
  notesData: { notes: string; summary: string } | null = null;
  notesError = false;

  // Book modal
  showBook = false;
  bookForm!: FormGroup;
  allDoctors: any[] = [];
  doctorsLoading = false;
  doctorsError = false;
  bookSlots: string[] = [];
  bookSlotsLoading = false;
  bookSubmitting = false;
  prebookAppt: PatientAppointmentCard | null = null; // for Rebook action

  today = new Date();
  minDate = this.isoDate(new Date(Date.now() + 86400000));

  constructor(
    private svc: PatientAppointmentsService,
    private state: PatientStateService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.buildRescheduleForm();
    this.buildBookForm();
    this.loadData();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── Data loading ──────────────────────────────────────────

  loadData() {
    this.loading = true;
    this.error   = '';
    this.svc.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.tabCounts = res.counts;
        this.allCards  = res._all;
        this.cards     = res._all[this.activeTab] ?? [];
        // Populate rawMap so cancel/reschedule PUTs send the full entity
        if (res._rawMap) this.rawMap = res._rawMap;
        this.loading   = false;
      },
      error: () => {
        this.loading = false;
        this.error   = 'Failed to load appointments.';
      }
    });
  }

  switchTab(tab: AppointmentTab) {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.cards = this.allCards[tab] ?? [];
  }

  // ── Card helpers ──────────────────────────────────────────

  cardClass(a: PatientAppointmentCard): string {
    return `appt-card ${a.tab}`;
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'Confirmed': 'b-green', 'Video': 'b-blue',
      'Pending confirmation': 'b-amber', 'Completed': 'b-gray', 'Cancelled': 'b-red'
    };
    return 'badge ' + (map[status] ?? 'b-gray');
  }

  actionCase(a: PatientAppointmentCard): 'A'|'B'|'C'|'D'|'E' {
    if (a.tab === 'past')      return 'D';
    if (a.tab === 'cancelled') return 'E';
    if (a.status === 'Video')  return 'B';
    if (a.status === 'Confirmed') return 'A';
    return 'C';
  }

  // ── Join Call ─────────────────────────────────────────────

  joinCall(appt: PatientAppointmentCard) {
    const url = appt.joinUrl?.trim() || `https://meet.jit.si/mediconnect-${appt.id}`;
    window.open(url, '_blank', 'noopener');
  }

  // ── Cancel ───────────────────────────────────────────────

  openCancelConfirm(appt: PatientAppointmentCard) {
    this.cancelingAppt = appt;
    this.showCancelConfirm = true;
  }

  closeCancelConfirm() {
    this.showCancelConfirm = false;
    this.cancelingAppt = null;
  }

  confirmCancel() {
    if (!this.cancelingAppt) return;
    this.cancelSubmitting = true;
    const orig = this.rawMap[this.cancelingAppt.id] ?? {};
    this.svc.cancel(this.cancelingAppt.id, orig).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cancelSubmitting = false;
        this.closeCancelConfirm();
        this.toast.show('Appointment cancelled.', 'success');
        this.loadData();
      },
      error: () => {
        this.cancelSubmitting = false;
        this.closeCancelConfirm();
        this.toast.show('Failed to cancel. Please try again.', 'error');
      }
    });
  }

  // ── Reschedule ────────────────────────────────────────────

  buildRescheduleForm() {
    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
    });
    this.rescheduleForm.get('date')!.valueChanges.subscribe(() => this.loadRescheduleSlots());
  }

  openReschedule(appt: PatientAppointmentCard) {
    this.reschedulingAppt = appt;
    this.rescheduleForm.reset();
    this.rescheduleSlots = [];
    this.showReschedule  = true;
  }

  loadRescheduleSlots() {
    if (!this.reschedulingAppt) return;
    const date = this.rescheduleForm.get('date')?.value;
    if (!date) return;
    const orig = this.rawMap[this.reschedulingAppt.id];
    const doctorId = orig?.doctor?.doctorId;
    if (!doctorId) return;
    this.rescheduleSlotsLoading = true;
    this.rescheduleSlots = [];
    this.svc.getAvailableSlots(doctorId, date).pipe(takeUntil(this.destroy$)).subscribe(slots => {
      this.rescheduleSlots = slots;
      this.rescheduleSlotsLoading = false;
    });
  }

  closeReschedule() {
    this.showReschedule   = false;
    this.reschedulingAppt = null;
  }

  submitReschedule() {
    if (this.rescheduleForm.invalid) { this.rescheduleForm.markAllAsTouched(); return; }
    if (!this.reschedulingAppt) return;
    this.rescheduleSubmitting = true;
    const { date, time } = this.rescheduleForm.value;
    const orig = this.rawMap[this.reschedulingAppt.id] ?? {};
    this.svc.reschedule(this.reschedulingAppt.id, date, time, orig).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.rescheduleSubmitting = false;
        this.closeReschedule();
        this.toast.show('Appointment rescheduled.', 'success');
        this.loadData();
      },
      error: () => {
        this.rescheduleSubmitting = false;
        this.toast.show('Failed to reschedule.', 'error');
      }
    });
  }

  // ── Notes panel ───────────────────────────────────────────

  openNotes(appt: PatientAppointmentCard) {
    this.notesAppt    = appt;
    this.showNotes    = true;
    this.notesData    = null;
    this.notesError   = false;
    this.notesLoading = true;
    // TODO: wire to GET /api/appointments/:id/notes endpoint
    setTimeout(() => {
      this.notesLoading = false;
      this.notesData    = {
        notes:   'Patient presented with mild hypertension. BP reading: 138/88 mmHg. ECG shows normal sinus rhythm. Advised lifestyle changes and continued medication.',
        summary: 'Routine cardiology follow-up. Medication dosage adjusted. Next review in 4 weeks.',
      };
    }, 800);
  }

  closeNotes() {
    this.showNotes  = false;
    this.notesAppt  = null;
    this.notesData  = null;
  }

  // ── Book Appointment ──────────────────────────────────────

  buildBookForm() {
    this.bookForm = this.fb.group({
      doctorId: [null, Validators.required],
      date:     ['', Validators.required],
      time:     ['', Validators.required],
      type:     ['In-person', Validators.required],
      reason:   ['', [Validators.required, Validators.minLength(3)]],
    });
    this.bookForm.get('date')!.valueChanges.subscribe(() => this.loadBookSlots());
    this.bookForm.get('doctorId')!.valueChanges.subscribe(() => {
      this.bookSlots = [];
      this.bookForm.get('time')?.reset();
      this.loadBookSlots();
    });
  }

  openBook(prefill?: PatientAppointmentCard) {
    this.prebookAppt  = prefill ?? null;
    this.bookForm.reset({ type: 'In-person' });
    this.bookSlots    = [];
    this.showBook     = true;
    if (!this.allDoctors.length) {
      this.doctorsLoading = true;
      this.doctorsError   = false;
      this.svc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe({
        next: d => {
          this.allDoctors     = d;
          this.doctorsLoading = false;
          if (prefill) this.applyBookPrefill(prefill);
        },
        error: () => {
          this.doctorsLoading = false;
          this.doctorsError   = true;
        },
      });
    } else if (prefill) {
      this.applyBookPrefill(prefill);
    }
  }

  retryLoadDoctors() {
    this.doctorsError   = false;
    this.doctorsLoading = true;
    this.svc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe({
      next: d => { this.allDoctors = d; this.doctorsLoading = false; },
      error: () => { this.doctorsLoading = false; this.doctorsError = true; },
    });
  }

  private applyBookPrefill(prefill: PatientAppointmentCard): void {
    const doc = this.allDoctors.find(d => d.user?.name === prefill.doctorName);
    if (doc) this.bookForm.patchValue({ doctorId: doc.doctorId, reason: prefill.reason });
  }

  loadBookSlots() {
    const doctorId = this.bookForm.get('doctorId')?.value;
    const date     = this.bookForm.get('date')?.value;
    if (!doctorId || !date) return;
    this.bookSlotsLoading = true;
    this.bookSlots = [];
    this.svc.getAvailableSlots(+doctorId, date).pipe(takeUntil(this.destroy$)).subscribe(slots => {
      this.bookSlots = slots;
      this.bookSlotsLoading = false;
    });
  }

  closeBook() {
    this.showBook    = false;
    this.prebookAppt = null;
  }

  submitBook() {
    if (this.bookForm.invalid) { this.bookForm.markAllAsTouched(); return; }
    this.bookSubmitting = true;
    const v = this.bookForm.value;
    this.svc.book({
      doctorId: +v.doctorId, date: v.date, time: v.time, type: v.type, reason: v.reason
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.bookSubmitting = false;
        this.closeBook();
        this.toast.show('Appointment booked successfully.', 'success');
        this.loadData();
        this.state.triggerRefresh();
      },
      error: () => {
        this.bookSubmitting = false;
        this.toast.show('Failed to book appointment.', 'error');
      }
    });
  }

  hasError(form: FormGroup, field: string, err: string): boolean {
    const c = form.get(field);
    return !!(c?.touched && c.hasError(err));
  }

  isoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  trackById(_: number, a: PatientAppointmentCard) { return a.id; }
}
