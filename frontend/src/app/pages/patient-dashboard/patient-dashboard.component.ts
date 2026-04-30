import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import {
  PatientPortalService,
  PortalAppointment,
  PortalMedicalRecord,
  PortalLabReport
} from '../../services/patient-portal.service';
import { BackendPatient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss'
})
export class PatientDashboardComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  patientInfo: BackendPatient | null = null;
  today = new Date();

  upcomingCount = 0;
  recordsCount = 0;
  labCount = 0;
  nextApptLabel = 'None scheduled';

  upcomingAppointments: PortalAppointment[] = [];
  recentRecords: PortalMedicalRecord[] = [];
  recentLabReports: PortalLabReport[] = [];

  patientLoading = true;
  apptLoading = true;
  recordsLoading = true;
  labLoading = true;

  apptError = '';
  recordsError = '';
  labError = '';

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    public portalService: PatientPortalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadPatientInfo();
  }

  private loadPatientInfo() {
    this.portalService.getAllPatients().subscribe({
      next: (patients) => {
        this.patientInfo = patients.find(p => p.user?.userId === this.currentUser?.userId) || null;
        this.patientLoading = false;
        this.loadData();
      },
      error: () => { this.patientLoading = false; this.loadData(); }
    });
  }

  private loadData() {
    const pid = this.patientInfo?.patientId;
    const todayStr = this.portalService.todayISO();

    // Appointments
    if (pid) {
      this.portalService.getPatientAppointments(pid).subscribe({
        next: (appts) => {
          const upcoming = appts
            .filter(a => a.appointmentDate >= todayStr && (a.status || '').toUpperCase() !== 'CANCELLED')
            .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
          this.upcomingCount = upcoming.length;
          this.upcomingAppointments = upcoming.slice(0, 4);
          const next = upcoming[0];
          this.nextApptLabel = next
            ? this.formatUpcomingDate(next.appointmentDate, next.appointmentTime)
            : 'None scheduled';
          this.apptLoading = false;
        },
        error: () => { this.apptError = 'Failed to load appointments'; this.apptLoading = false; }
      });

      // Medical Records
      this.portalService.getPatientMedicalRecords(pid).subscribe({
        next: (records) => {
          this.recordsCount = records.length;
          this.recentRecords = [...records]
            .sort((a, b) => (b.recordDate || '').localeCompare(a.recordDate || ''))
            .slice(0, 4);
          this.recordsLoading = false;
        },
        error: () => { this.recordsError = 'Failed to load records'; this.recordsLoading = false; }
      });
    } else {
      this.apptLoading = false;
      this.recordsLoading = false;
    }

    // Lab Reports — scoped to this patient
    if (pid) {
      this.portalService.getPatientLabReports(pid).subscribe({
        next: (reports) => {
          this.labCount = reports.length;
          this.recentLabReports = [...reports]
            .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''))
            .slice(0, 4);
          this.labLoading = false;
        },
        error: () => { this.labError = 'Failed to load lab reports'; this.labLoading = false; }
      });
    } else {
      this.labLoading = false;
    }
  }

  formatUpcomingDate(dateStr: string, timeStr: string): string {
    const tomorrow = new Date(this.today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = this.portalService.todayISO();
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const timeLabel = timeStr ? ` · ${this.portalService.formatTime(timeStr)}` : '';
    if (dateStr === todayStr) return `Today${timeLabel}`;
    if (dateStr === tomorrowStr) return `Tomorrow${timeLabel}`;
    const date = new Date(dateStr);
    return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}${timeLabel}`;
  }

  getAge(): number {
    return this.portalService.getAge(this.patientInfo?.dateOfBirth || this.patientInfo?.user?.dateOfBirth);
  }

  getDoctorName(appt: PortalAppointment): string {
    return appt.doctor?.user?.name || '—';
  }

  getDoctorSpec(appt: PortalAppointment): string {
    return appt.doctor?.department?.departmentName || appt.doctor?.specialization || '';
  }

  getHospital(appt: PortalAppointment): string {
    return appt.hospital?.hospitalName || '';
  }

  getTypeClass(type: string): string {
    return (type || '').toUpperCase() === 'VIDEO' ? 'badge-online' : 'badge-inperson';
  }

  getTypeLabel(type: string): string {
    return this.portalService.normalizeType(type);
  }

  getStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'SCHEDULED' || s === 'CONFIRMED') return 'badge-scheduled';
    if (s === 'COMPLETED') return 'badge-completed';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'badge-cancelled';
    return 'badge-default';
  }

  getResultClass(result: string | undefined): string {
    const r = (result || '').toUpperCase().trim();
    if (!r || r === 'PENDING') return 'badge-pending';
    if (r === 'ABNORMAL') return 'badge-abnormal';
    return 'badge-normal';
  }

  getResultLabel(result: string | undefined): string {
    return this.portalService.normalizeLabResult(result);
  }

  formatDate(d: string | undefined): string {
    return this.portalService.formatDate(d);
  }

  formatTime(t: string): string {
    return this.portalService.formatTime(t);
  }

  retrySection(section: string) {
    if (section === 'appt') { this.apptError = ''; this.apptLoading = true; }
    if (section === 'records') { this.recordsError = ''; this.recordsLoading = true; }
    if (section === 'lab') { this.labError = ''; this.labLoading = true; }
    this.loadData();
  }
}
