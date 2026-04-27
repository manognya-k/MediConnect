import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService, Hospital, AdminDoctor, AdminPatient, AdminAppointment, AdminBed } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  today = new Date();
  hospitals: Hospital[] = [];
  totalHospitals = 0;
  totalDoctors = 0;
  totalPatients = 0;
  totalAppointments = 0;
  todayAppointments = 0;
  pendingLabAlerts = 0;
  hospitalStats: { hospital: Hospital; doctorCount: number; patientCount: number; appointmentCount: number; bedCount: number }[] = [];
  loading = true;
  doctors: AdminDoctor[] = [];
  patients: AdminPatient[] = [];
  appointments: AdminAppointment[] = [];
  beds: AdminBed[] = [];
  recentAppointments: AdminAppointment[] = [];

  constructor(
    private svc: AdminService,
    public auth: AuthService,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    forkJoin({
      hospitals: this.svc.getHospitals(),
      doctors: this.svc.getDoctors(),
      patients: this.svc.getPatients(),
      appointments: this.svc.getAppointments(),
      beds: this.svc.getBeds()
    }).subscribe({
      next: ({ hospitals, doctors, patients, appointments, beds }) => {
        this.hospitals = hospitals;
        this.doctors = doctors;
        this.patients = patients;
        this.appointments = appointments;
        this.beds = beds;

        this.totalHospitals = hospitals.length;
        this.totalDoctors = doctors.length;
        this.totalPatients = patients.length;
        this.totalAppointments = appointments.length;

        const todayStr = this.svc.todayISO();
        this.todayAppointments = appointments.filter(a => a.appointmentDate === todayStr).length;

        this.hospitalStats = hospitals.map(hospital => ({
          hospital,
          doctorCount: doctors.filter(d => d.hospital?.hospitalId === hospital.hospitalId).length,
          patientCount: patients.length,
          appointmentCount: appointments.filter(a =>
            a.hospital?.hospitalId === hospital.hospitalId && a.appointmentDate === todayStr
          ).length,
          bedCount: beds.filter(b => b.hospital?.hospitalId === hospital.hospitalId).length
        }));

        this.recentAppointments = [...appointments]
          .sort((a, b) => {
            const da = new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`);
            const db = new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`);
            return db.getTime() - da.getTime();
          })
          .slice(0, 5);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'SCHEDULED' || s === 'CONFIRMED') return 'badge-scheduled';
    if (s === 'COMPLETED') return 'badge-completed';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'badge-cancelled';
    return 'badge-default';
  }

  getTypeLabel(type: string): string {
    return (type || '').toUpperCase() === 'VIDEO' ? 'Video' : 'In-Person';
  }
}
