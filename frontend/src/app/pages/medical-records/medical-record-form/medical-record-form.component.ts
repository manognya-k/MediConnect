import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MedicalRecordService } from '../../../services/medical-record.service';
import { ToastService } from '../../../services/toast.service';
import { MedicalRecord } from '../../../models/medical-record.model';

const BASE = 'http://localhost:8081/api';

interface PatientOption { patientId: number; name: string; }

@Component({
  selector: 'app-medical-record-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medical-record-form.component.html',
  styleUrl: './medical-record-form.component.scss'
})
export class MedicalRecordFormComponent implements OnInit {
  @Input() editData: MedicalRecord | null = null;
  @Input() doctorId: number | null = null;
  @Input() hospitalId: number | null = null;
  @Input() selectedPatientId: number | null = null;
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

  get isEdit(): boolean { return !!this.editData; }
  get title(): string { return this.isEdit ? 'Edit Record' : 'New Medical Record'; }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private svc: MedicalRecordService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const e = this.editData;
    this.form = this.fb.group({
      recordDate: [e?.recordDate ? this.toISO(e.recordDate) : this.today, Validators.required],
      diagnosis: [e?.diagnosis || '', Validators.required],
      treatment: [e?.treatment || ''],
      prescription: [e?.prescription || ''],
      notes: [e?.notes || ''],
    });

    this.loadPatients();
  }

  private toISO(display: string): string {
    try {
      const d = new Date(display);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch {}
    return this.today;
  }

  private loadPatients() {
    this.http.get<any[]>(`${BASE}/patients`).subscribe({
      next: (pts) => {
        this.allPatients = pts
          .filter(p => p.user?.name)
          .map(p => ({ patientId: p.patientId, name: p.user.name }));

        if (this.editData) {
          const match = this.allPatients.find(p => p.patientId === this.editData!.patientId);
          if (match) { this.selectedPatient = match; this.patientQuery = match.name; }
        } else if (this.selectedPatientId) {
          const match = this.allPatients.find(p => p.patientId === this.selectedPatientId);
          if (match) { this.selectedPatient = match; this.patientQuery = match.name; }
        }
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

  save() {
    this.submitted = true;
    this.patientError = !this.selectedPatient;
    if (this.form.invalid || !this.selectedPatient) return;

    this.saving = true;
    const v = this.form.value;

    const body: any = {
      patient: { patientId: this.selectedPatient.patientId },
      recordDate: v.recordDate,
      diagnosis: v.diagnosis,
      treatment: v.treatment || null,
      prescription: v.prescription || null,
      notes: v.notes || null,
    };

    if (this.doctorId) body.doctor = { doctorId: this.doctorId };
    if (this.hospitalId) body.hospital = { hospitalId: this.hospitalId };

    const req = this.isEdit
      ? this.svc.update(this.editData!.recordId, body)
      : this.svc.create(body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.toast.show(this.isEdit ? 'Record updated.' : 'Record created.', 'success');
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.toast.show('Failed to save record.', 'error');
      }
    });
  }

  cancel() { this.cancelled.emit(); }
}
