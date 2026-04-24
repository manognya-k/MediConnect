import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LabReportService } from '../../../services/lab-report.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { DashboardService } from '../../../services/dashboard.service';

const BASE = 'http://localhost:8081/api';

interface PatientOption {
  patientId: number;
  name: string;
}

@Component({
  selector: 'app-lab-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lab-request-form.component.html',
  styleUrl: './lab-request-form.component.scss'
})
export class LabRequestFormComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;

  allPatients: PatientOption[] = [];
  filteredPatients: PatientOption[] = [];
  patientQuery = '';
  showDropdown = false;
  selectedPatient: PatientOption | null = null;
  patientError = false;

  saving = false;
  submitted = false;
  today = new Date().toISOString().slice(0, 10);
  notesMax = 300;

  private doctorId: number | null = null;

  readonly TEST_TYPES = [
    'Lipid Panel', 'ECG Analysis', 'HbA1c Test', 'CBC',
    'Troponin I', 'BNP', 'Coronary Angiogram', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private svc: LabReportService,
    private toast: ToastService,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      testType: ['', Validators.required],
      priority: ['Routine', Validators.required],
      requestedDate: [this.today, Validators.required],
      notes: ['', [Validators.maxLength(300)]],
    });

    this.loadPatients();
    this.resolveDoctorId();
  }

  private loadPatients() {
    this.http.get<any[]>(`${BASE}/patients`).subscribe({
      next: (pts) => {
        this.allPatients = pts
          .filter(p => p.user?.name)
          .map(p => ({ patientId: p.patientId, name: p.user.name }));
      },
      error: () => {}
    });
  }

  private resolveDoctorId() {
    const user = this.auth.getUser();
    if (!user) return;
    this.dashSvc.getAllDoctors().subscribe({
      next: (docs) => {
        const doc = docs.find(d => d.user?.userId === user.userId);
        this.doctorId = doc?.doctorId ?? null;
      },
      error: () => {}
    });
  }

  get notesLength(): number { return (this.form.get('notes')?.value || '').length; }
  get f() { return this.form.controls; }
  isInvalid(field: string): boolean { return this.submitted && !!this.f[field]?.invalid; }

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
    setTimeout(() => { this.showDropdown = false; }, 150);
  }

  save() {
    this.submitted = true;
    this.patientError = !this.selectedPatient;
    if (this.form.invalid || !this.selectedPatient) return;

    this.saving = true;
    const v = this.form.value;

    const body: any = {
      patient: { patientId: this.selectedPatient.patientId },
      testName: v.testType,
      reportDate: v.requestedDate,
      result: 'PENDING',
      status: 'PENDING',
    };

    if (this.doctorId) body.doctor = { doctorId: this.doctorId };

    this.svc.create(body).subscribe({
      next: () => {
        this.saving = false;
        this.toast.show('Lab test requested successfully.', 'success');
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.toast.show('Failed to submit request.', 'error');
      }
    });
  }

  cancel() { this.cancelled.emit(); }
}
