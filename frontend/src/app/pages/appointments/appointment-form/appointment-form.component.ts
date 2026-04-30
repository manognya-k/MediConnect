import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastService } from '../../../services/toast.service';
import { Appointment, BackendAppointment } from '../../../models/appointment.model';

const BASE = 'http://localhost:8081/api';

interface PatientOption {
  patientId: number;
  name: string;
}

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.scss'
})
export class AppointmentFormComponent implements OnInit {
  @Input() editData: Appointment | null = null;
  @Input() doctorId: number | null = null;
  @Input() hospitalId: number | null = null;
  @Input() preselectedPatientId: number | null = null;
  @Input() preselectedPatientName: string = '';
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;

  // Patient autocomplete
  allPatients: PatientOption[] = [];
  filteredPatients: PatientOption[] = [];
  patientQuery = '';
  showDropdown = false;
  selectedPatient: PatientOption | null = null;
  patientError = false;

  saving = false;
  submitted = false;
  today = new Date().toISOString().slice(0, 10);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private apptSvc: AppointmentService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      date: [this.today, [Validators.required]],
      time: ['09:00', [Validators.required]],
      type: ['In-person', [Validators.required]],
      status: ['Pending', [Validators.required]],
    });

    if (this.editData) {
      const raw = this.editData.raw;
      this.form.patchValue({
        date: this.editData.date,
        time: (raw.appointmentTime || '09:00:00').slice(0, 5),
        type: this.editData.type,
        status: this.editData.status,
      });
      this.selectedPatient = {
        patientId: Number(this.editData.patientId),
        name: this.editData.patientName
      };
      this.patientQuery = this.editData.patientName;
    } else if (this.preselectedPatientId) {
      this.selectedPatient = {
        patientId: this.preselectedPatientId,
        name: this.preselectedPatientName
      };
      this.patientQuery = this.preselectedPatientName;
    }

    this.loadPatients();
  }

  private loadPatients() {
    const url = this.hospitalId
      ? `${BASE}/patients/hospital/${this.hospitalId}`
      : `${BASE}/patients`;
    this.http.get<any[]>(url).subscribe({
      next: (pts) => {
        this.allPatients = pts
          .filter(p => p.user?.name)
          .map(p => ({ patientId: p.patientId, name: p.user.name }));
        if (this.allPatients.length === 0 && this.hospitalId) {
          this.http.get<any[]>(`${BASE}/patients`).subscribe({
            next: (all) => {
              this.allPatients = all
                .filter(p => p.user?.name)
                .map(p => ({ patientId: p.patientId, name: p.user.name }));
            },
            error: () => {}
          });
        }
      },
      error: () => {}
    });
  }

  onPatientInput(val: string) {
    this.patientQuery = val;
    this.selectedPatient = null;
    if (!val.trim()) {
      this.filteredPatients = [];
      this.showDropdown = false;
      return;
    }
    const q = val.toLowerCase();
    this.filteredPatients = this.allPatients
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 8);
    this.showDropdown = this.filteredPatients.length > 0;
  }

  selectPatient(pt: PatientOption) {
    this.selectedPatient = pt;
    this.patientQuery = pt.name;
    this.showDropdown = false;
    this.patientError = false;
  }

  closeDropdown() {
    // Delay so click on option fires first
    setTimeout(() => { this.showDropdown = false; }, 150);
  }

  get f() { return this.form.controls; }

  isInvalid(field: string): boolean {
    return this.submitted && !!this.f[field]?.invalid;
  }

  save() {
    this.submitted = true;
    this.patientError = !this.selectedPatient;
    if (this.form.invalid || !this.selectedPatient) return;

    this.saving = true;
    const v = this.form.value;
    const timeRaw = v.time.length === 5 ? v.time + ':00' : v.time;
    const typeRaw = v.type === 'Video' ? 'VIDEO' : 'IN_PERSON';
    const statusRaw = (v.status as string).toUpperCase();

    const body: Partial<BackendAppointment> = {
      patient: { patientId: this.selectedPatient.patientId } as any,
      appointmentDate: v.date,
      appointmentTime: timeRaw,
      status: statusRaw,
      appointmentType: typeRaw,
    };

    if (this.doctorId) body.doctor = { doctorId: this.doctorId } as any;
    if (this.hospitalId) body.hospital = { hospitalId: this.hospitalId } as any;

    if (this.editData) {
      const merged = { ...this.editData.raw, ...body };
      this.apptSvc.update(Number(this.editData.id), merged).subscribe({
        next: () => {
          this.saving = false;
          this.toast.show('Appointment updated.', 'success');
          this.saved.emit();
        },
        error: () => {
          this.saving = false;
          this.toast.show('Failed to update appointment.', 'error');
        }
      });
    } else {
      this.apptSvc.create(body).subscribe({
        next: () => {
          this.saving = false;
          this.toast.show('Appointment scheduled.', 'success');
          this.saved.emit();
        },
        error: () => {
          this.saving = false;
          this.toast.show('Failed to create appointment.', 'error');
        }
      });
    }
  }

  cancel() {
    this.cancelled.emit();
  }
}
