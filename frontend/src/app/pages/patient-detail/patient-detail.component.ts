import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { PatientFormComponent } from '../patients/patient-form/patient-form.component';
import { ToastService } from '../../services/toast.service';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, PatientFormComponent],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.scss'
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  appointments: any[] = [];
  loading = true;
  error = '';
  showEditForm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private toastService: ToastService,
    public layout: LayoutService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.patientService.getPatientById(id).subscribe({
      next: (p) => {
        this.patient = p;
        this.loading = false;
        this.patientService.getPatientAppointments(id).subscribe(a => {
          this.appointments = a.slice(0, 3);
        });
      },
      error: () => {
        this.error = 'Patient not found.';
        this.loading = false;
      }
    });
  }

  statusClass(s: string) {
    const m: Record<string, string> = { Active: 'b-green', Monitoring: 'b-amber', Critical: 'b-red', Inactive: 'b-gray' };
    return m[s] || 'b-gray';
  }

  apptStatusClass(s: string) {
    const m: Record<string, string> = { CONFIRMED: 'b-green', PENDING: 'b-amber', CANCELLED: 'b-red' };
    return m[(s || '').toUpperCase()] || 'b-gray';
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

  goBack() { this.router.navigate(['/doctor/patients']); }
}
