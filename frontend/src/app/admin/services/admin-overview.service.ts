import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminOverviewData, StatCard, PatientInflowPoint,
  DiseaseSlice, BedOccupancyBar, RevenuePoint,
  HospitalPin, AiInsight
} from '../models/admin-overview.model';

@Injectable({ providedIn: 'root' })
export class AdminOverviewService {
  private base = environment.apiBase;
  constructor(
    private http: HttpClient,
    private adminAuth: AdminAuthService
  ) {}

  getOverview(): Observable<AdminOverviewData> {
    const adminId = this.adminAuth.getAdmin()?.id ?? 0;
    return forkJoin({
      stats: this.http.get<any>(`${this.base}/admin/${adminId}/dashboard-stats`).pipe(catchError(() => of({}))),
      bedOccupancy: this.http.get<any[]>(`${this.base}/admin/bed-occupancy`).pipe(catchError(() => of([]))),
      analytics: this.http.get<any>(`${this.base}/admin/analytics`).pipe(catchError(() => of({})))
    }).pipe(
      map(({ stats, bedOccupancy, analytics }) => ({
        stats:        this.buildStatCards(stats),
        inflowData:   this.buildInflow(analytics),
        diseaseData:  this.buildDisease(stats),
        bedData:      this.buildBedData(bedOccupancy),
        revenueData:  this.buildRevenue(analytics),
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
    const occupancy = Math.round(Number(s.occupancyPct ?? 0));
    return [
      { accent: 'teal',  icon: 'hospital', label: 'Total Patients',  value: String(s.totalPatients ?? 0),      sub: 'Registered patients',                     subAccent: 'teal'  },
      { accent: 'green', icon: 'patients', label: 'Total Doctors',   value: this.fmt(s.totalDoctors ?? 0),     sub: 'Doctors onboarded',    subAccent: 'green' },
      { accent: occupancy >= 80 ? 'red' : 'amber', icon: 'icu', label: 'Occupancy', value: `${occupancy}%`, sub: 'Current bed occupancy', subAccent: occupancy >= 80 ? 'red' : 'amber' },
      { accent: 'amber', icon: 'revenue',  label: 'Revenue',   value: this.fmt(Math.round(Number(s.revenue ?? 0))), sub: 'Booked revenue',                    subAccent: 'amber' },
      { accent: 'blue',  icon: 'doctors',  label: 'Doctors On Duty',   value: String(s.doctorsOnDuty ?? 0),       sub: `of ${s.totalDoctors ?? 0} total`,     subAccent: 'blue'  }
    ];
  }

  private buildBedData(beds: any[]): BedOccupancyBar[] {
    if (!beds?.length) return [];
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
    const src = beds?.length ? beds : [];
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
    if ((s.occupancyPct ?? 0) >= 75) out.push({ dot: '#F59E0B', html: `Hospital network occupancy at <strong>${Math.round(s.occupancyPct)}%</strong>.` });
    out.push({ dot: '#0AAFB8', html: `<strong>${s.doctorsOnDuty ?? 0}</strong> of <strong>${s.totalDoctors ?? 0}</strong> doctors currently on duty across all branches.` });
    if ((s.totalPatients ?? 0) > 0) out.push({ dot: '#10B981', html: `<strong>${this.fmt(s.totalPatients)}</strong> active patients with <strong>${s.totalAppointments}</strong> appointments in the system.` });
    return out.slice(0, 3);
  }

  private buildDisease(s: any): DiseaseSlice[] {
    const entries = Object.entries(s?.diseaseDistribution ?? {}) as Array<[string, number]>;
    const total = entries.reduce((acc, [, count]) => acc + Number(count || 0), 0);
    const colors = ['#0AAFB8', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
    return entries
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6)
      .map(([label, value], index) => ({
        label,
        value: total > 0 ? Math.round((Number(value) / total) * 100) : 0,
        color: colors[index % colors.length]
      }));
  }

  private buildInflow(analytics: any): PatientInflowPoint[] {
    const flow: Record<string, number> = analytics?.monthlyFlow ?? {};
    return Object.entries(flow).map(([label, total]) => ({
      label,
      outpatient: total as number,
      inpatient: 0
    }));
  }

  private buildRevenue(analytics: any): RevenuePoint[] {
    const rev: Record<string, number> = analytics?.monthlyRevenue ?? {};
    const entries = Object.entries(rev);
    if (!entries.length) return [];
    return entries.map(([label, revenue]) => ({ label, revenue: Number(revenue) }));
  }
}
