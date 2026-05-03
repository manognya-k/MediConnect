import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminTelemedicineService } from '../../services/admin-telemedicine.service';

@Component({
  selector: 'app-admin-telemedicine',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe],
  templateUrl: './admin-telemedicine.component.html',
  styleUrl: './admin-telemedicine.component.scss'
})
export class AdminTelemedicineComponent implements OnInit {

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

  constructor(private telemedicineSvc: AdminTelemedicineService) {}

  ngOnInit(): void {
    this.telemedicineSvc.getData().subscribe(({ appointments, doctors }) => {
      this.appointments = appointments ?? [];
      this.doctors      = doctors      ?? [];
      this.loading      = false;
    });
  }
}
