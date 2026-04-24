import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastService } from '../../../services/toast.service';

const BASE = 'http://localhost:8081/api';

interface PatientOption { patientId: number; name: string; }

@Component({
  selector: 'app-schedule-session-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-session-form.component.html',
  styleUrl: './schedule-session-form.component.scss'
})
export class ScheduleSessionFormComponent implements OnInit {
  @Input() doctorId: number | null = null;
  @Input() hospitalId: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  saving = false;
  submitted = false;
  today = new Date().toISOString().slice(0, 10);

  allPatients: PatientOption[] = [];
  filteredPatients: PatientOption[] = [];
  patientQuery = '';
  showDropdown = false;
  selectedPatient: PatientOption | null = null;
  patientError = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private apptSvc: AppointmentService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      date:     [this.today, Validators.required],
      time:     ['', Validators.required],
      duration: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
      reason:   ['', [Validators.required, Validators.minLength(3)]],
      notes:    ['', Validators.maxLength(500)],
    });

    this.http.get<any[]>(`${BASE}/patients`).subscribe({
      next: (pts) => {
        this.allPatients = pts
          .filter(p => p.user?.name)
          .map(p => ({ patientId: p.patientId, name: p.user.name }));
      },
      error: () => {}
    });
  }

  onPatientInput(val: string) {
    this.patientQuery = val;
    this.selectedPatient = null;
    if (!val.trim()) { this.filteredPatients = []; this.showDropdown = false; return; }
    const q = val.toLowerCase();
    this.filteredPatients = this.allPatients.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    this.showDropdown = this.filteredPatients.length > 0;
  }

  selectPatient(pt: PatientOption) {
    this.selectedPatient = pt;
    this.patientQuery = pt.name;
    this.showDropdown = false;
    this.patientError = false;
  }

  closeDropdown() { setTimeout(() => { this.showDropdown = false; }, 150); }

  isInvalid(field: string): boolean {
    return this.submitted && !!this.form.get(field)?.invalid;
  }

  get notesLength(): number { return (this.form.get('notes')?.value || '').length; }

  save() {
    this.submitted = true;
    this.patientError = !this.selectedPatient;
    if (this.form.invalid || !this.selectedPatient) return;

    this.saving = true;
    const v = this.form.value;

    const body: any = {
      patient:         { patientId: this.selectedPatient.patientId },
      appointmentDate: v.date,
      appointmentTime: v.time + ':00',
      appointmentType: 'VIDEO',
      status:          'PENDING',
      sessionUrl:      v.reason, // stored in sessionUrl field — TODO: add dedicated reason field
    };

    if (this.doctorId)   body.doctor   = { doctorId: this.doctorId };
    if (this.hospitalId) body.hospital = { hospitalId: this.hospitalId };

    this.apptSvc.create(body).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.toast.show('Failed to schedule session.', 'error');
      }
    });
  }

  cancel() { this.cancelled.emit(); }
}
