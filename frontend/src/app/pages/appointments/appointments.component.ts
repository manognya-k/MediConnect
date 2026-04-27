import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { DashboardService } from '../../services/dashboard.service';
import { AppointmentService } from '../../services/appointment.service';
import { ToastService } from '../../services/toast.service';
import {
  Appointment, AppointmentFilter, AppointmentStats,
  AppointmentTab, BackendAppointment
} from '../../models/appointment.model';
import { AppointmentFormComponent } from './appointment-form/appointment-form.component';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, AppointmentFormComponent],
  providers: [DatePipe],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  today = new Date();

  // Doctor context
  doctorId: number | null = null;
  hospitalId: number | null = null;

  // Raw backend data
  private allAppointments: BackendAppointment[] = [];

  // Displayed data
  appointments: Appointment[] = [];
  stats: AppointmentStats = {
    todayTotal: 0, videoCount: 0, inPersonCount: 0,
    confirmed: 0, pending: 0, cancelled: 0, confirmRate: 0
  };

  // Filter state
  activeTab: AppointmentTab = 'today';
  searchValue = '';
  typeFilter = '';
  statusFilter = '';
  dateFilter = '';
  page = 1;
  pageSize = 10;
  total = 0;

  // UI state
  loading = false;
  error = '';
  calendarVisible = false;

  // Calendar
  calendarMonth = new Date();
  calendarDates: (number | null)[] = [];
  appointmentDates = new Set<string>();
  readonly WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Side panel
  selectedAppt: Appointment | null = null;
  panelVisible = false;
  cancellingId: string | null = null;

  // Modal
  formVisible = false;
  editAppt: Appointment | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private dashSvc: DashboardService,
    private apptSvc: AppointmentService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user) { this.router.navigate(['/login']); return; }

    this.dateFilter = this.apptSvc.todayISO();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.searchValue = val;
      this.page = 1;
      this.applyFilter();
    });

    // Try to resolve doctorId for scoped loading; fall back to all
    this.dashSvc.getAllDoctors().subscribe({
      next: (doctors) => {
        const doc = doctors.find(d => d.user?.userId === user.userId);
        if (doc) {
          this.doctorId = doc.doctorId ?? null;
          this.hospitalId = doc.hospital?.hospitalId ?? null;
        }
        this.loadAppointments();
      },
      error: () => this.loadAppointments()
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAppointments() {
    this.loading = true;
    this.error = '';

    const source$ = this.doctorId
      ? this.apptSvc.getByDoctor(this.doctorId)
      : this.apptSvc.getAll();

    source$.subscribe({
      next: (appts) => {
        this.allAppointments = appts;
        this.appointmentDates = new Set(appts.map(a => a.appointmentDate));
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load appointments. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const filter: AppointmentFilter = {
      tab: this.activeTab,
      page: this.page,
      pageSize: this.pageSize,
      search: this.searchValue || undefined,
      type: this.typeFilter || undefined,
      status: this.statusFilter || undefined,
      date: this.activeTab !== 'today' && this.dateFilter ? this.dateFilter : undefined,
    };
    const result = this.apptSvc.applyFilter(this.allAppointments, filter);
    this.appointments = result.data;
    this.total = result.total;
    this.stats = result.stats;
  }

  switchTab(tab: AppointmentTab) {
    this.activeTab = tab;
    this.page = 1;
    this.dateFilter = tab === 'today' ? this.apptSvc.todayISO() : '';
    this.applyFilter();
  }

  onSearch(val: string) { this.searchSubject.next(val); }
  onTypeChange() { this.page = 1; this.applyFilter(); }
  onStatusChange() { this.page = 1; this.applyFilter(); }
  onDateChange() { this.page = 1; this.applyFilter(); }
  retry() { this.loadAppointments(); }

  // ── Pagination ──────────────────────────────────
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIdx(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get endIdx(): number { return Math.min(this.page * this.pageSize, this.total); }

  getPageNumbers(): (number | '...')[] {
    const t = this.totalPages;
    if (t <= 5) return Array.from({ length: t }, (_, i) => i + 1);
    const p = this.page;
    if (p <= 3) return [1, 2, 3, 4, '...', t];
    if (p >= t - 2) return [1, '...', t - 3, t - 2, t - 1, t];
    return [1, '...', p - 1, p, p + 1, '...', t];
  }

  goToPage(p: number | '...') {
    if (typeof p !== 'number') return;
    this.page = p;
    this.applyFilter();
  }

  // ── Calendar ─────────────────────────────────────
  toggleCalendar() {
    this.calendarVisible = !this.calendarVisible;
    if (this.calendarVisible) this.buildCalendar();
  }

  buildCalendar() {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) dates.push(null);
    for (let d = 1; d <= daysInMonth; d++) dates.push(d);
    while (dates.length % 7 !== 0) dates.push(null);
    this.calendarDates = dates;
  }

  prevMonth() {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() - 1, 1
    );
    this.buildCalendar();
  }

  nextMonth() {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() + 1, 1
    );
    this.buildCalendar();
  }

  calendarDayHasAppt(day: number | null): boolean {
    if (!day) return false;
    return this.appointmentDates.has(this.calIso(day));
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    return this.calIso(day) === this.apptSvc.todayISO();
  }

  isSelected(day: number | null): boolean {
    if (!day) return false;
    return this.calIso(day) === this.dateFilter;
  }

  selectCalendarDay(day: number | null) {
    if (!day) return;
    const iso = this.calIso(day);
    this.dateFilter = iso;
    this.activeTab = iso === this.apptSvc.todayISO() ? 'today' : (iso > this.apptSvc.todayISO() ? 'upcoming' : 'past');
    this.calendarVisible = false;
    this.page = 1;
    this.applyFilter();
  }

  private calIso(day: number): string {
    const y = this.calendarMonth.getFullYear();
    const m = String(this.calendarMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-${String(day).padStart(2, '0')}`;
  }

  // ── Side Panel ───────────────────────────────────
  openPanel(appt: Appointment) {
    this.selectedAppt = appt;
    this.panelVisible = true;
  }

  closePanel() {
    this.panelVisible = false;
    this.selectedAppt = null;
  }

  cancelFromPanel() {
    if (!this.selectedAppt) return;
    const id = this.selectedAppt.id;
    this.cancellingId = id;
    this.apptSvc.cancel(Number(id), this.selectedAppt.raw).subscribe({
      next: () => {
        this.toast.show('Appointment cancelled.', 'info');
        this.closePanel();
        this.cancellingId = null;
        this.loadAppointments();
      },
      error: () => {
        this.toast.show('Failed to cancel appointment.', 'error');
        this.cancellingId = null;
      }
    });
  }

  editFromPanel() {
    if (!this.selectedAppt) return;
    this.editAppt = this.selectedAppt;
    this.formVisible = true;
    this.closePanel();
  }

  joinFromPanel() {
    if (!this.selectedAppt?.joinUrl) {
      this.toast.show('No session URL available for this appointment.', 'info');
      return;
    }
    window.open(this.selectedAppt.joinUrl, '_blank');
  }

  // ── Table actions ────────────────────────────────
  joinCall(appt: Appointment, event: Event) {
    event.stopPropagation();
    if (appt.joinUrl) window.open(appt.joinUrl, '_blank');
    else this.toast.show('No session URL available.', 'info');
  }

  viewPatient(appt: Appointment, event: Event) {
    event.stopPropagation();
    if (appt.patientId) this.router.navigate(['/doctor/patients', appt.patientId]);
  }

  openEditModal(appt: Appointment, event: Event) {
    event.stopPropagation();
    this.editAppt = appt;
    this.formVisible = true;
  }

  openNewModal() {
    this.editAppt = null;
    this.formVisible = true;
  }

  onFormSaved() {
    this.formVisible = false;
    this.editAppt = null;
    this.loadAppointments();
  }

  onFormCancelled() {
    this.formVisible = false;
    this.editAppt = null;
  }

  // ── Badge / action helpers ────────────────────────
  typeBadgeClass(type: string): string {
    return type === 'Video' ? 'b-blue' : 'b-gray';
  }

  statusBadgeClass(status: string): string {
    if (status === 'Confirmed' || status === 'Scheduled') return 'b-green';
    if (status === 'Cancelled') return 'b-red';
    if (status === 'Completed') return 'b-gray';
    return 'b-amber';
  }

  showJoin(appt: Appointment): boolean {
    return appt.type === 'Video' && (appt.status === 'Confirmed' || appt.status === 'Scheduled');
  }

  showEdit(appt: Appointment): boolean {
    return appt.status === 'Cancelled' || appt.status === 'Completed';
  }

  showView(appt: Appointment): boolean {
    return !this.showJoin(appt) && !this.showEdit(appt);
  }
}
