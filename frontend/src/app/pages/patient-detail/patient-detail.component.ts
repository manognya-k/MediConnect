import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { PatientFormComponent } from '../patients/patient-form/patient-form.component';
import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form.component';
import { ToastService } from '../../services/toast.service';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, PatientFormComponent, AppointmentFormComponent],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.scss'
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  appointments: any[] = [];
  loading = true;
  error = '';
  showEditForm = false;
  showScheduleForm = false;

  doctorId: number | null = null;
  hospitalId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private toastService: ToastService,
    public layout: LayoutService,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Resolve doctor context for the appointment form
    const user = this.auth.getUser();
    if (user) {
      this.dashSvc.getAllDoctors().subscribe({
        next: (doctors) => {
          const doc = doctors.find(d => d.user?.userId === user.userId);
          if (doc) {
            this.doctorId = doc.doctorId;
            this.hospitalId = doc.hospital?.hospitalId ?? null;
          }
        }
      });
    }

    this.patientService.getPatientById(id).subscribe({
      next: (p) => {
        this.patient = p;
        this.loading = false;
        this.loadAppointments(id);
      },
      error: () => {
        this.error = 'Patient not found.';
        this.loading = false;
      }
    });
  }

  private loadAppointments(id: string) {
    this.patientService.getPatientAppointments(id).subscribe(a => {
      this.appointments = a.slice(0, 3);
    });
  }

  statusClass(s: string) {
    const m: Record<string, string> = { Active: 'b-green', Monitoring: 'b-amber', Critical: 'b-red', Inactive: 'b-gray' };
    return m[s] || 'b-gray';
  }

  apptStatusClass(s: string) {
    const u = (s || '').toUpperCase();
    const m: Record<string, string> = {
      CONFIRMED: 'b-green', SCHEDULED: 'b-green',
      PENDING: 'b-amber',
      CANCELLED: 'b-red', CANCELED: 'b-red',
      COMPLETED: 'b-gray'
    };
    return m[u] || 'b-gray';
  }

  formatTime(t: string) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  }

  onEditSaved() {
    this.showEditForm = false;
    this.toastService.show('Patient updated.', 'success');
    const id = this.route.snapshot.paramMap.get('id')!;
    this.patientService.getPatientById(id).subscribe(p => this.patient = p);
  }

  onAppointmentScheduled() {
    this.showScheduleForm = false;
    this.toastService.show('Appointment scheduled successfully.', 'success');
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadAppointments(id);
  }

  goBack() { this.router.navigate(['/doctor/patients']); }
}
