import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PatientUser, PatientDashboardStats } from '../models/patient-dashboard.model';

@Injectable({ providedIn: 'root' })
export class PatientStateService {
  private patientSubject = new BehaviorSubject<PatientUser | null>(null);
  private statsSubject  = new BehaviorSubject<PatientDashboardStats | null>(null);

  patient$ = this.patientSubject.asObservable();
  stats$   = this.statsSubject.asObservable();

  setPatient(p: PatientUser) { this.patientSubject.next(p); }
  setStats(s: PatientDashboardStats)  { this.statsSubject.next(s); }

  getPatient(): PatientUser | null { return this.patientSubject.getValue(); }
  getStats(): PatientDashboardStats | null  { return this.statsSubject.getValue(); }

  clear() {
    this.patientSubject.next(null);
    this.statsSubject.next(null);
  }
}
