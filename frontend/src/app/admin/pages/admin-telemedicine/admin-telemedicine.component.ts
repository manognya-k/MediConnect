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
  searchTerm = '';

  sessionRecords = [
    { id: 'VS-1041', doctor: 'Dr. Ananya Sharma',  patient: 'Rahul Mehta',    dept: 'Cardiology',   duration: '18 min', date: 'Apr 30, 9:00 AM',  status: 'completed' },
    { id: 'VS-1040', doctor: 'Dr. Suresh Patel',   patient: 'Priya Nair',     dept: 'General',      duration: '12 min', date: 'Apr 30, 8:30 AM',  status: 'completed' },
    { id: 'VS-1039', doctor: 'Dr. Kavya Reddy',    patient: 'Amit Verma',     dept: 'Neurology',    duration: '25 min', date: 'Apr 29, 5:00 PM',  status: 'completed' },
    { id: 'VS-1038', doctor: 'Dr. Arjun Nair',     patient: 'Sunita Gupta',   dept: 'Orthopedics',  duration: '—',      date: 'Apr 29, 3:00 PM',  status: 'missed'    },
    { id: 'VS-1037', doctor: 'Dr. Deepika Singh',  patient: 'Vikram Sharma',  dept: 'Cardiology',   duration: '22 min', date: 'Apr 28, 11:00 AM', status: 'completed' },
  ];

  // Schedule Session modal
  showSchedule = false;
  scheduleData = { doctorName: '', patientName: '', date: '', time: '', type: 'VIDEO', notes: '' };
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

  get todayAppointments(): any[] {
    const today = new Date().toISOString().split('T')[0];
    const filtered = this.appointments.filter(a =>
      a.appointmentDate && a.appointmentDate.includes(today)
    );
    return filtered.length > 0 ? filtered : this.appointments.slice(0, 5);
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
    this.scheduleData = { doctorName: '', patientName: '', date: '', time: '', type: 'VIDEO', notes: '' };
    this.showSchedule = true;
  }

  closeSchedule() { this.showSchedule = false; }

  submitSchedule() {
    if (!this.scheduleData.doctorName?.trim() || !this.scheduleData.patientName?.trim() ||
        !this.scheduleData.date || !this.scheduleData.time) {
      this.toast.show('Please fill all required fields.', 'error');
      return;
    }
    this.scheduleSubmitting = true;
    const payload = {
      appointmentDate: this.scheduleData.date,
      appointmentTime: this.scheduleData.time,
      appointmentType: this.scheduleData.type,
      notes: this.scheduleData.notes,
      status: 'PENDING',
    };
    this.telemedicineSvc.scheduleAppointment(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.scheduleSubmitting = false;
        this.closeSchedule();
        this.toast.show('Video session scheduled successfully.', 'success');
      },
      error: () => {
        this.scheduleSubmitting = false;
        this.toast.show('Failed to schedule session. Please try again.', 'error');
      }
    });
  }

  // ── Join Session ──────────────────────────────────────────────────────────

  joinSession(appt: any) {
    const url = appt.sessionUrl || appt.joinUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      this.toast.show('Video link not available. Check patient email for the session link.', 'error');
    }
  }

  constructor(
    private telemedicineSvc: AdminTelemedicineService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.telemedicineSvc.getData().pipe(takeUntil(this.destroy$)).subscribe(({ appointments, doctors }) => {
      this.appointments = appointments ?? [];
      this.doctors      = doctors      ?? [];
      this.loading      = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
