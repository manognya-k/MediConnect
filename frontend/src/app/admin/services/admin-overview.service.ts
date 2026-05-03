import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  AdminOverviewData, StatCard, PatientInflowPoint,
  DiseaseSlice, BedOccupancyBar, RevenuePoint,
  HospitalPin, AiInsight
} from '../models/admin-overview.model';

@Injectable({ providedIn: 'root' })
export class AdminOverviewService {

  // TODO: wire all methods to real backend endpoints under /api/admin/overview/*

  constructor(private http: HttpClient) {}

  getOverview(): Observable<AdminOverviewData> {
    return forkJoin({
      stats:        this.getStats(),
      inflowData:   this.getPatientInflow(),
      diseaseData:  this.getDiseaseDistribution(),
      bedData:      this.getBedOccupancy(),
      revenueData:  this.getRevenueTrend(),
      hospitalPins: this.getHospitalPins(),
      aiInsights:   this.getAiInsights(),
      lastUpdated:  of(new Date())
    });
  }

  private getStats(): Observable<StatCard[]> {
    return of([
      {
        accent:    'teal',
        icon:      'hospital',
        label:     'Total Hospitals',
        value:     '14',
        sub:       '↑ 2 this year',
        subAccent: 'teal'
      },
      {
        accent:    'green',
        icon:      'patients',
        label:     'Active Patients',
        value:     '8,432',
        sub:       '↑ 12.3%',
        subAccent: 'green'
      },
      {
        accent:    'red',
        icon:      'icu',
        label:     'ICU Occupancy',
        value:     '87%',
        sub:       '⚠ Critical',
        subAccent: 'red'
      },
      {
        accent:    'amber',
        icon:      'revenue',
        label:     'Daily Revenue',
        value:     '₹4.2M',
        sub:       '↑ 8.1%',
        subAccent: 'amber'
      },
      {
        accent:    'blue',
        icon:      'doctors',
        label:     'Doctors On Duty',
        value:     '342',
        sub:       'of 418 total',
        subAccent: 'blue'
      }
    ]);
  }

  private getPatientInflow(): Observable<PatientInflowPoint[]> {
    const labels  = ['Apr 7','8','9','10','11','12','13','14','15','16','17','18','19','20'];
    const inp     = [82,91,78,95,88,102,97,84,99,105,112,88,96,108];
    const out     = [210,195,220,205,240,228,215,235,248,232,256,241,238,262];
    return of(labels.map((l, i) => ({ label: l, inpatient: inp[i], outpatient: out[i] })));
  }

  private getDiseaseDistribution(): Observable<DiseaseSlice[]> {
    return of([
      { label: 'Cardiology',   value: 28, color: '#0AAFB8' },
      { label: 'Orthopaedics', value: 19, color: '#3B82F6' },
      { label: 'Neurology',    value: 16, color: '#8B5CF6' },
      { label: 'General',      value: 37, color: '#10B981' }
    ]);
  }

  private getBedOccupancy(): Observable<BedOccupancyBar[]> {
    const hospitals = ['Mumbai','Delhi','Chennai','Hyderabad','Kolkata','Bangalore'];
    const occupied  = [78,65,92,88,71,60];
    const available = [22,35,8,12,29,40];
    return of(hospitals.map((h, i) => ({ hospital: h, occupied: occupied[i], available: available[i] })));
  }

  private getRevenueTrend(): Observable<RevenuePoint[]> {
    return of([
      { label: 'Jan', revenue: 3.1 },
      { label: 'Feb', revenue: 3.6 },
      { label: 'Mar', revenue: 3.9 },
      { label: 'Apr', revenue: 4.2 }
    ]);
  }

  private getHospitalPins(): Observable<HospitalPin[]> {
    return of([
      { name: 'Mumbai',    top: '30%', left: '28%', status: 'available', beds: '42 beds' },
      { name: 'Hyderabad', top: '45%', left: '42%', status: 'limited',   beds: '8 beds'  },
      { name: 'Chennai',   top: '55%', left: '32%', status: 'critical',  beds: 'ICU Full' },
      { name: 'Delhi',     top: '22%', left: '52%', status: 'available', beds: '28 beds' },
      { name: 'Kolkata',   top: '40%', left: '62%', status: 'available', beds: '31 beds' }
    ]);
  }

  private getAiInsights(): Observable<AiInsight[]> {
    return of([
      {
        dot:  '#EF4444',
        html: '<strong>Hyderabad Branch</strong> ICU will reach full capacity in approx. <strong>3 days</strong> at current admission rate. Recommend transferring non-critical ICU patients.'
      },
      {
        dot:  '#F59E0B',
        html: '<strong>Cardiology appointments</strong> increased <strong>23%</strong> this month across all branches. Consider adding 2 additional cardiologists.'
      },
      {
        dot:  '#0AAFB8',
        html: '<strong>Chennai Branch</strong> Paracetamol stock projected to <strong>run out in 4 days</strong>. Supplier order recommended immediately.'
      }
    ]);
  }
}
