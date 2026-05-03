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
  private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  getOverview(): Observable<AdminOverviewData> {
    return forkJoin({
      stats: this.http.get<any>(`${this.base}/admin/stats`).pipe(catchError(() => of({}))),
      bedOccupancy: this.http.get<any[]>(`${this.base}/admin/bed-occupancy`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ stats, bedOccupancy }) => ({
        stats:        this.buildStatCards(stats),
        inflowData:   this.demoInflow(),
        diseaseData:  this.demoDisease(),
        bedData:      this.buildBedData(bedOccupancy),
        revenueData:  this.demoRevenue(),
        hospitalPins: this.buildPins(bedOccupancy),
        aiInsights:   this.buildInsights(stats, bedOccupancy),
        lastUpdated:  new Date()
      }))
    );
  }

  private fmt(n: number): string {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
  }

  private buildStatCards(s: any): StatCard[] {
    const icu = s.icuOccupancyPct ?? 0;
    return [
      { accent: 'teal',  icon: 'hospital', label: 'Total Hospitals',  value: String(s.totalHospitals ?? 0),      sub: 'Active branches',                     subAccent: 'teal'  },
      { accent: 'green', icon: 'patients', label: 'Active Patients',   value: this.fmt(s.totalPatients ?? 0),     sub: `${s.totalAppointments ?? 0} appts`,    subAccent: 'green' },
      { accent: icu >= 80 ? 'red' : 'amber', icon: 'icu', label: 'ICU Occupancy', value: `${icu}%`, sub: `${s.occupiedBeds ?? 0} / ${s.totalBeds ?? 0} beds`, subAccent: icu >= 80 ? 'red' : 'amber' },
      { accent: 'amber', icon: 'revenue',  label: 'Inventory Items',   value: this.fmt(s.totalInventoryItems ?? 0), sub: 'Items tracked',                    subAccent: 'amber' },
      { accent: 'blue',  icon: 'doctors',  label: 'Doctors On Duty',   value: String(s.doctorsOnDuty ?? 0),       sub: `of ${s.totalDoctors ?? 0} total`,     subAccent: 'blue'  }
    ];
  }

  private buildBedData(beds: any[]): BedOccupancyBar[] {
    if (!beds?.length) return [
      { hospital: 'Mumbai', occupied: 78, available: 22 },
      { hospital: 'Delhi',  occupied: 65, available: 35 },
      { hospital: 'Chennai', occupied: 92, available: 8 },
      { hospital: 'Hyderabad', occupied: 88, available: 12 },
      { hospital: 'Kolkata', occupied: 71, available: 29 },
      { hospital: 'Bangalore', occupied: 60, available: 40 }
    ];
    return beds.slice(0, 6).map(h => ({
      hospital: h.city || h.hospitalName,
      occupied: h.occupancyPct || 0,
      available: 100 - (h.occupancyPct || 0)
    }));
  }

  private buildPins(beds: any[]): HospitalPin[] {
    const pos = [
      { top: '30%', left: '28%' }, { top: '22%', left: '52%' },
      { top: '55%', left: '32%' }, { top: '45%', left: '42%' },
      { top: '40%', left: '62%' }
    ];
    const src = beds?.length ? beds : [
      { hospitalName: 'Mumbai',    occupancyPct: 58, availableBeds: 42 },
      { hospitalName: 'Delhi',     occupancyPct: 65, availableBeds: 28 },
      { hospitalName: 'Chennai',   occupancyPct: 92, availableBeds: 0  },
      { hospitalName: 'Hyderabad', occupancyPct: 88, availableBeds: 8  },
      { hospitalName: 'Kolkata',   occupancyPct: 71, availableBeds: 31 }
    ];
    return src.slice(0, 5).map((h, i) => ({
      name:   h.city || h.hospitalName,
      top:    pos[i]?.top  ?? '50%',
      left:   pos[i]?.left ?? '50%',
      status: h.occupancyPct >= 90 ? 'critical' : h.occupancyPct >= 70 ? 'limited' : 'available',
      beds:   h.availableBeds > 0  ? `${h.availableBeds} beds` : 'ICU Full'
    }));
  }

  private buildInsights(s: any, beds: any[]): AiInsight[] {
    const out: AiInsight[] = [];
    const critical = beds?.find(h => h.occupancyPct >= 90);
    if (critical) out.push({ dot: '#EF4444', html: `<strong>${critical.hospitalName}</strong> at <strong>${critical.occupancyPct}%</strong> bed occupancy — recommend patient transfer protocols.` });
    if ((s.icuOccupancyPct ?? 0) >= 75) out.push({ dot: '#F59E0B', html: `ICU network at <strong>${s.icuOccupancyPct}%</strong> capacity — ${s.occupiedBeds} of ${s.totalBeds} beds occupied.` });
    out.push({ dot: '#0AAFB8', html: `<strong>${s.doctorsOnDuty ?? 0}</strong> of <strong>${s.totalDoctors ?? 0}</strong> doctors currently on duty across all branches.` });
    if ((s.totalPatients ?? 0) > 0) out.push({ dot: '#10B981', html: `<strong>${this.fmt(s.totalPatients)}</strong> active patients with <strong>${s.totalAppointments}</strong> appointments in the system.` });
    return out.slice(0, 3);
  }

  private demoInflow(): PatientInflowPoint[] {
    const labels = ['Apr 7','8','9','10','11','12','13','14','15','16','17','18','19','20'];
    const inp = [82,91,78,95,88,102,97,84,99,105,112,88,96,108];
    const out = [210,195,220,205,240,228,215,235,248,232,256,241,238,262];
    return labels.map((l, i) => ({ label: l, inpatient: inp[i], outpatient: out[i] }));
  }

  private demoDisease(): DiseaseSlice[] {
    return [
      { label: 'Cardiology',   value: 28, color: '#0AAFB8' },
      { label: 'Orthopaedics', value: 19, color: '#3B82F6' },
      { label: 'Neurology',    value: 16, color: '#8B5CF6' },
      { label: 'General',      value: 37, color: '#10B981' }
    ];
  }

  private demoRevenue(): RevenuePoint[] {
    return [
      { label: 'Jan', revenue: 3.1 }, { label: 'Feb', revenue: 3.6 },
      { label: 'Mar', revenue: 3.9 }, { label: 'Apr', revenue: 4.2 }
    ];
  }
}
