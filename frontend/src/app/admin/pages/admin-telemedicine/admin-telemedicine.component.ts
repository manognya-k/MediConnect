import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AdminTelemedicineService } from '../../services/admin-telemedicine.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-telemedicine',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe],
  templateUrl: './admin-telemedicine.component.html',
  styleUrl: './admin-telemedicine.component.scss'
})
export class AdminTelemedicineComponent implements OnInit, OnDestroy {

  loading = true;
  appointments: any[] = [];
  doctors: any[]      = [];
  patients: any[]     = [];
  searchTerm = '';

  sessionRecords: any[] = [];

  // Schedule Session modal
  showSchedule = false;
  scheduleData: { doctorId: number | null; patientId: number | null; date: string; time: string; type: string; notes: string } =
    { doctorId: null, patientId: null, date: '', time: '', type: 'VIDEO', notes: '' };
  scheduleSubmitting = false;

  // ── Doctor status getters ──────────────────────────────────────────────────

  get onlineDoctors(): any[] {
    return this.doctors.filter(d => d.status === 'AVAILABLE');
  }

  get busyDoctors(): any[] {
    return this.doctors.filter(d => d.status === 'BUSY' || d.status === 'IN_SESSION');
  }

  get offlineDoctors(): any[] {
    return this.doctors.filter(d => d.status !== 'AVAILABLE' && d.status !== 'BUSY' && d.status !== 'IN_SESSION');
  }

  // ── Appointment getters ────────────────────────────────────────────────────

  private parseDateISO(raw: any): string | null {
    if (!raw) return null;
    if (Array.isArray(raw))
      return `${raw[0]}-${String(raw[1]).padStart(2,'0')}-${String(raw[2]).padStart(2,'0')}`;
    return String(raw).substring(0, 10);
  }

  get todayAppointments(): any[] {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.appointments.filter(a => this.parseDateISO(a.appointmentDate) === todayStr);
  }

  get thisWeekCount(): number {
    const now = new Date();
    const dow = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dow);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return this.appointments.filter(a => {
      const iso = this.parseDateISO(a.appointmentDate);
      if (!iso) return false;
      const d = new Date(iso);
      return d >= weekStart && d <= weekEnd;
    }).length;
  }

  get filteredAppointments(): any[] {
    if (!this.searchTerm.trim()) return this.appointments;
    const term = this.searchTerm.toLowerCase();
    return this.appointments.filter(a => {
      const patName = (a.patientName || a.patient?.user?.name || '').toLowerCase();
      const docName = (a.doctorName  || a.doctor?.user?.name  || '').toLowerCase();
      return patName.includes(term) || docName.includes(term);
    });
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  getDoctorStatusClass(status: string): string {
    if (status === 'AVAILABLE')                          return 'online';
    if (status === 'BUSY' || status === 'IN_SESSION')    return 'busy';
    return 'offline';
  }

  getDoctorStatusLabel(status: string): string {
    if (status === 'AVAILABLE')  return 'Online';
    if (status === 'BUSY')       return 'In Session';
    if (status === 'IN_SESSION') return 'In Session';
    return 'Offline';
  }

  getApptBadge(status: string): string {
    if (status === 'CONFIRMED')  return 'b-green';
    if (status === 'PENDING')    return 'b-amber';
    if (status === 'CANCELLED')  return 'b-red';
    return 'b-amber';
  }

  getSessionBadge(status: string): string {
    if (status === 'completed') return 'b-green';
    if (status === 'missed')    return 'b-red';
    return 'b-amber';
  }

  // ── TrackBy helpers ────────────────────────────────────────────────────────

  trackById(_index: number, item: any): any {
    return item?.id ?? _index;
  }

  trackBySessionId(_index: number, item: any): string {
    return item?.id ?? _index;
  }

  private destroy$ = new Subject<void>();

  // ── Schedule Session ──────────────────────────────────────────────────────

  openSchedule() {
    this.scheduleData = { doctorId: null, patientId: null, date: '', time: '', type: 'VIDEO', notes: '' };
    this.showSchedule = true;
  }

  closeSchedule() { this.showSchedule = false; }

  submitSchedule() {
    if (!this.scheduleData.doctorId || !this.scheduleData.patientId ||
        !this.scheduleData.date || !this.scheduleData.time) {
      this.toast.show('Please fill all required fields.', 'error');
      return;
    }
    this.scheduleSubmitting = true;
    const payload = {
      patient:         { patientId: this.scheduleData.patientId },
      doctor:          { doctorId:  this.scheduleData.doctorId  },
      appointmentDate: this.scheduleData.date,
      appointmentTime: this.scheduleData.time + ':00',
      appointmentType: 'VIDEO',
      notes:           this.scheduleData.notes || '',
      status:          'PENDING',
    };
    this.telemedicineSvc.scheduleAppointment(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.scheduleSubmitting = false;
        this.closeSchedule();
        this.toast.show('Video session scheduled successfully.', 'success');
        this.loadData();
      },
      error: () => {
        this.scheduleSubmitting = false;
        this.toast.show('Failed to schedule session. Please try again.', 'error');
      }
    });
  }

  // ── Join Session ──────────────────────────────────────────────────────────

  canJoin(appt: any): boolean {
    const s = (appt.status || '').toUpperCase();
    return s !== 'CANCELLED' && s !== 'COMPLETED';
  }

  joinSession(appt: any) {
    if (!this.canJoin(appt)) {
      this.toast.show('Cannot join a cancelled or completed appointment.', 'error');
      return;
    }
    const url = appt.sessionUrl && appt.sessionUrl.startsWith('http')
      ? appt.sessionUrl
      : `https://meet.jit.si/mediconnect-${appt.appointmentId}`;
    window.open(url, '_blank', 'noopener');
  }

  constructor(
    private telemedicineSvc: AdminTelemedicineService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.telemedicineSvc.getPatients().pipe(takeUntil(this.destroy$)).subscribe(p => this.patients = p);
  }

  loadData(): void {
    this.telemedicineSvc.getData().pipe(takeUntil(this.destroy$)).subscribe(({ appointments, doctors }) => {
      this.appointments = appointments ?? [];
      this.doctors      = doctors ?? [];
      this.loading      = false;
    });
    this.telemedicineSvc.getVideoSessions().pipe(takeUntil(this.destroy$)).subscribe(sessions => {
      this.sessionRecords = sessions;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
