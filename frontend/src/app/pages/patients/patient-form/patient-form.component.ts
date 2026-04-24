import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService } from '../../../services/patient.service';
import { Patient } from '../../../models/patient.model';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.scss'
})
export class PatientFormComponent implements OnInit {
  @Input() patient: Patient | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  saving = false;
  serverError = '';

  get isEdit() { return !!this.patient; }

  constructor(private fb: FormBuilder, private patientService: PatientService) {}

  ngOnInit() {
    this.form = this.fb.group({
      firstName:    [this.patient?.firstName || '',    [Validators.required, Validators.minLength(2)]],
      lastName:     [this.patient?.lastName  || '',    [Validators.required, Validators.minLength(2)]],
      email:        [this.patient?.email     || '',    [Validators.required, Validators.email]],
      phone:        ['',                               []],
      age:          [this.patient?.age       || '',    [Validators.required, Validators.min(0), Validators.max(150)]],
      gender:       [this.patient?.gender    || '',    [Validators.required]],
      bloodGroup:   [this.patient?.bloodGroup || '',   [Validators.required]],
      dateOfBirth:  [this.patient?.dateOfBirth || '',  []],
      address:      [this.patient?.address   || '',    []],
      emergencyContact: [this.patient?.emergencyContact || '', []],
      password:     [this.isEdit ? 'NOCHANGE' : '',   this.isEdit ? [] : [Validators.required, Validators.minLength(6)]],
    });
  }

  f(name: string) { return this.form.get(name)!; }

  hasError(name: string, err: string) {
    const c = this.f(name);
    return c.touched && c.hasError(err);
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving = true;
    this.serverError = '';
    const v = this.form.value;

    if (this.isEdit) {
      const payload = {
        gender: v.gender,
        bloodGroup: v.bloodGroup,
        dateOfBirth: v.dateOfBirth || undefined,
        address: v.address || undefined,
        emergencyContact: v.emergencyContact || undefined,
      };
      this.patientService.updatePatient(this.patient!.id, payload as any).subscribe({
        next: () => { this.saving = false; this.saved.emit(); },
        error: (e) => {
          this.serverError = e?.error?.message || 'Update failed. Please try again.';
          this.saving = false;
        }
      });
    } else {
      this.patientService.createPatient({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        password: v.password,
        phone: v.phone || '0000000000',
        dateOfBirth: v.dateOfBirth || undefined,
        bloodGroup: v.bloodGroup || undefined,
        gender: v.gender || undefined,
      }).subscribe({
        next: () => { this.saving = false; this.saved.emit(); },
        error: (e) => {
          this.serverError = e?.error || 'Failed to add patient. Please try again.';
          this.saving = false;
        }
      });
    }
  }

  cancel() { this.cancelled.emit(); }
}
