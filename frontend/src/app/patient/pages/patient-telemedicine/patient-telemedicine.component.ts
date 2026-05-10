import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PatientTelemedicineService, computeTimeBadge } from '../../services/patient-telemedicine.service';
import { NextSession, ScheduledSession, PastSession } from '../../models/patient-telemedicine.model';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';
import { ToastService } from '../../../services/toast.service';

// Avatar colour pairs for deterministic assignment
const AVATAR_PAIRS = [
  { bg: '#E8F2FD', color: '#1A5FA8' },
  { bg: '#E6F5EF', color: '#0F7B50' },
  { bg: '#FEF3CD', color: '#B45309' },
  { bg: '#EDE9FE', color: '#6D28D9' }
];

@Component({
  selector: 'app-patient-telemedicine',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './patient-telemedicine.component.html',
  styleUrl: './patient-telemedicine.component.scss'
})
export class PatientTelemedicineComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;

  nextSession:        NextSession | null    = null;
  scheduledSessions:  ScheduledSession[]    = [];
  pastSessions:       PastSession[]         = [];
  pastTotal           = 0;

  // Join button state
  joiningSession = false;

  // Modals
  showBookModal       = false;
  showRescheduleModal = false;
  rescheduleTarget:   ScheduledSession | null = null;

  // Cancelling
  cancellingId: string | null = null;

  // Doctor list for book modal
  allDoctors:     any[]    = [];
  doctorsLoading  = false;
  doctorsError    = false;

  // Forms
  bookForm:        FormGroup;
  rescheduleForm:  FormGroup;

  // Skeleton helpers
  readonly sessionSkels = [1, 2];
  readonly rowSkels     = [1, 2, 3];

  constructor(
    private svc:      PatientTelemedicineService,
    private apptSvc:  PatientAppointmentsService,
    private toast:    ToastService,
    private fb:       FormBuilder
  ) {
    this.bookForm = this.fb.group({
      doctorId: [null, Validators.required],
      date:     ['', Validators.required],
      time:     ['', Validators.required],
      reason:   ['', [Validators.required, Validators.minLength(3)]]
    });

    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAll();

    // Auto-refresh next session every 2 minutes
    timer(120000, 120000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.svc.getNextSession().subscribe(s => this.nextSession = s);
    });

    // Countdown timer — updates minutesUntilStart every minute
    timer(0, 60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.nextSession) {
        this.nextSession.minutesUntilStart = Math.ceil(
          (new Date(this.nextSession.scheduledAt).getTime() - Date.now()) / 60000
        );
      }
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private loadAll() {
    this.loading = true;
    forkJoin({
      next:      this.svc.getNextSession(),
      scheduled: this.svc.getScheduledSessions(),
      past:      this.svc.getPastSessions(1, 10)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ next, scheduled, past }) => {
        this.nextSession       = next;
        this.scheduledSessions = scheduled.map((s, i) => ({
          ...s,
          avatarBg:    s.avatarBg    || AVATAR_PAIRS[i % AVATAR_PAIRS.length].bg,
          avatarColor: s.avatarColor || AVATAR_PAIRS[i % AVATAR_PAIRS.length].color,
          ...computeTimeBadge(s.scheduledAt)
        }));
        this.pastSessions = past.data;
        this.pastTotal    = past.total;
        this.loading = false;
      },
      error: () => {
        this.toast.show('Failed to load telemedicine data.', 'error');
        this.loading = false;
      }
    });
  }

  // ── Join session ──────────────────────────────────────────────────────────

  joinSession(): void {
    if (!this.nextSession || this.joiningSession) return;
    const url = this.nextSession.joinUrl?.trim() ||
      `https://meet.jit.si/mediconnect-${this.nextSession.sessionId}`;
    window.open(url, '_blank', 'noopener');
  }

  // ── Cancel session ────────────────────────────────────────────────────────

  cancelSession(session: ScheduledSession): void {
    if (!confirm(`Cancel session with ${session.doctorName}?`)) return;
    this.cancellingId = session.sessionId;

    this.svc.cancelSession(session.sessionId).subscribe({
      next: () => {
        this.scheduledSessions = this.scheduledSessions.filter(
          s => s.sessionId !== session.sessionId
        );
        this.cancellingId = null;
        this.toast.show('Session cancelled.', 'success');
      },
      error: () => {
        this.cancellingId = null;
        this.toast.show('Could not cancel session. Please try again.', 'error');
      }
    });
  }

  // ── Book modal ────────────────────────────────────────────────────────────

  openBookModal(): void {
    this.bookForm.reset();
    this.showBookModal = true;
    if (!this.allDoctors.length) {
      this.loadDoctors();
    }
  }

  private loadDoctors(): void {
    this.doctorsLoading = true;
    this.doctorsError   = false;
    this.apptSvc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe({
      next: d => { this.allDoctors = d; this.doctorsLoading = false; },
      error: () => { this.doctorsLoading = false; this.doctorsError = true; },
    });
  }

  retryLoadDoctors(): void { this.loadDoctors(); }

  closeBookModal(): void { this.showBookModal = false; }

  submitBook(): void {
    if (this.bookForm.invalid) { this.bookForm.markAllAsTouched(); return; }
    const v = this.bookForm.value;
    this.svc.bookSession({ doctorId: +v.doctorId, date: v.date, time: v.time, reason: v.reason }).subscribe({
      next: () => {
        this.showBookModal = false;
        this.toast.show('Video call booked successfully.', 'success');
        this.loadAll();
      },
      error: () => this.toast.show('Failed to book session. Please try again.', 'error')
    });
  }

  // ── Reschedule modal ──────────────────────────────────────────────────────

  openReschedule(session: ScheduledSession): void {
    this.rescheduleTarget = session;
    this.rescheduleForm.reset();
    this.showRescheduleModal = true;
  }

  closeRescheduleModal(): void { this.showRescheduleModal = false; this.rescheduleTarget = null; }

  submitReschedule(): void {
    if (this.rescheduleForm.invalid || !this.rescheduleTarget) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }
    const { date, time } = this.rescheduleForm.value;
    this.svc.rescheduleSession(this.rescheduleTarget.sessionId, date, time).subscribe({
      next: () => {
        this.showRescheduleModal = false;
        this.rescheduleTarget    = null;
        this.toast.show('Session rescheduled.', 'success');
        this.loadAll();
      },
      error: () => this.toast.show('Failed to reschedule. Please try again.', 'error')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusBadgeClass(status: ScheduledSession['status']): string {
    return status === 'Confirmed' ? 'b-green' : 'b-amber';
  }

  pastStatusClass(status: PastSession['status']): string {
    switch (status) {
      case 'Completed': return 'b-green';
      case 'No-show':   return 'b-red';
      case 'Cancelled': return 'b-sub';
      default:          return 'b-sub';
    }
  }

  minDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  trackBySession(_: number, s: ScheduledSession) { return s.sessionId; }
  trackByPast   (_: number, p: PastSession)      { return p.sessionId; }
}
