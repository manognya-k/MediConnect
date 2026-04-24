import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../services/layout.service';
import { AppointmentService } from '../../services/appointment.service';
import { TelemedicineService } from '../../services/telemedicine.service';
import { SessionTimerService } from '../../services/session-timer.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { BackendAppointment } from '../../models/appointment.model';
import { TelemedicineSession, TelemedicineStats, SessionStatus } from '../../models/telemedicine.model';
import { ScheduleSessionFormComponent } from './schedule-session-form/schedule-session-form.component';

@Component({
  selector: 'app-telemedicine',
  standalone: true,
  imports: [CommonModule, ScheduleSessionFormComponent],
  templateUrl: './telemedicine.component.html',
  styleUrl: './telemedicine.component.scss'
})
export class TelemedicineComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  pastLoading = false;
  pastError = '';

  liveAndUpcoming: TelemedicineSession[] = [];
  pastSessions: TelemedicineSession[] = [];
  pastTotal = 0;
  pastPage = 1;
  pastPageSize = 10;

  stats: TelemedicineStats = {
    liveNow: 0, todayTotal: 0, todayRemaining: 0,
    thisWeekTotal: 0, weeklyChangePercent: 0, avgDurationMinutes: 0
  };

  showScheduleForm = false;
  joiningId: string | null = null;

  doctorId: number | null = null;
  hospitalId: number | null = null;

  // Per-session observables
  countdowns = new Map<string, Observable<string>>();
  elapseds = new Map<string, Observable<string>>();

  private allSessions: TelemedicineSession[] = [];

  constructor(
    public layout: LayoutService,
    private apptSvc: AppointmentService,
    private teleS: TelemedicineService,
    private timerS: SessionTimerService,
    private toast: ToastService,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    this.resolveDoctorAndLoad();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resolveDoctorAndLoad() {
    const user = this.auth.getUser();
    if (!user) { this.loadAll(null); return; }
    this.dashSvc.getAllDoctors().pipe(takeUntil(this.destroy$)).subscribe({
      next: (docs) => {
        const doc = docs.find(d => d.user?.userId === user.userId);
        if (doc) {
          this.doctorId = doc.doctorId;
          this.hospitalId = doc.hospital?.hospitalId ?? null;
        }
        this.loadAll(this.doctorId);
      },
      error: () => this.loadAll(null)
    });
  }

  loadAll(doctorId: number | null) {
    this.loading = true;
    this.error = '';

    const req = doctorId
      ? this.apptSvc.getByDoctor(doctorId)
      : this.apptSvc.getAll();

    req.pipe(takeUntil(this.destroy$)).subscribe({
      next: (appointments: BackendAppointment[]) => {
        const videoAppts = this.teleS.filterVideoAppointments(appointments);
        this.allSessions = videoAppts.map((a, i) => this.teleS.mapToSession(a, i));
        this.stats = this.teleS.computeStats(this.allSessions);
        this.liveAndUpcoming = this.teleS.getLiveAndUpcoming(this.allSessions);
        this.buildTimerObservables();
        this.loadPastPage(1);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load sessions.';
      }
    });
  }

  private buildTimerObservables() {
    this.countdowns.clear();
    this.elapseds.clear();
    this.liveAndUpcoming.forEach(s => {
      if (s.status === 'Upcoming' || s.status === 'Scheduled') {
        this.countdowns.set(s.id, this.timerS.getCountdown(s.scheduledTime));
      }
      if (s.status === 'Live' && s.startedAt) {
        this.elapseds.set(s.id, this.timerS.getElapsed(s.startedAt));
      }
    });
  }

  loadPastPage(page: number) {
    this.pastPage = page;
    const result = this.teleS.getPastSessions(this.allSessions, page, this.pastPageSize);
    this.pastSessions = result.data;
    this.pastTotal = result.total;
  }

  get pastTotalPages(): number {
    return Math.ceil(this.pastTotal / this.pastPageSize);
  }

  get pastPageNumbers(): number[] {
    const total = this.pastTotalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    const cur = this.pastPage;
    if (cur <= 3) {
      pages.push(1, 2, 3, 4, -1, total);
    } else if (cur >= total - 2) {
      pages.push(1, -1, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, -1, cur - 1, cur, cur + 1, -1, total);
    }
    return [...new Set(pages)];
  }

  get pastStart(): number { return (this.pastPage - 1) * this.pastPageSize + 1; }
  get pastEnd(): number { return Math.min(this.pastPage * this.pastPageSize, this.pastTotal); }

  countdown$(id: string): Observable<string> | null {
    return this.countdowns.get(id) ?? null;
  }

  elapsed$(id: string): Observable<string> | null {
    return this.elapseds.get(id) ?? null;
  }

  countdownClass(countdown: string): string {
    if (countdown === 'Live') return 'b-live';
    if (countdown.includes('h')) return 'b-amber';
    return 'b-blue';
  }

  joinSession(session: TelemedicineSession) {
    if (!session.joinUrl || session.status === 'Scheduled') return;
    this.joiningId = session.id;
    setTimeout(() => {
      window.open(session.joinUrl, '_blank', 'noopener');
      this.joiningId = null;
    }, 800);
  }

  isJoinable(session: TelemedicineSession): boolean {
    return session.status === 'Live' || session.status === 'Upcoming';
  }

  statusBadgeClass(status: SessionStatus): string {
    const map: Record<SessionStatus, string> = {
      Live: 'b-live',
      Upcoming: 'b-blue',
      Scheduled: 'b-gray',
      Completed: 'b-green',
      'No-show': 'b-red',
      Cancelled: 'b-gray',
    };
    return map[status] ?? 'b-gray';
  }

  pastStatusClass(status: SessionStatus): string {
    if (status === 'Completed') return 'b-green';
    if (status === 'No-show') return 'b-red';
    return 'b-gray';
  }

  onSessionScheduled() {
    this.showScheduleForm = false;
    this.loadAll(this.doctorId);
    this.toast.show('Session scheduled successfully.', 'success');
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }) + ' · ' + new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return iso; }
  }

  trackById(_: number, item: TelemedicineSession) { return item.id; }
}
