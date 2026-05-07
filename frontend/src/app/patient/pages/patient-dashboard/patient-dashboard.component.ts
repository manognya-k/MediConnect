import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml, SafeValue } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { PatientDashboardService } from '../../services/patient-dashboard.service';
import { PatientStateService } from '../../services/patient-state.service';
import {
  PatientUser, PatientHealthScore, PatientDashboardStats,
  PatientAppointment, PatientVitals, TodayMedicine,
  ActivityItem, PatientNotification
} from '../../models/patient-dashboard.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss'
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';

  patient!:       PatientUser;
  healthScore!:   PatientHealthScore;
  stats!:         PatientDashboardStats;
  appointments:   PatientAppointment[] = [];
  vitals!:        PatientVitals;
  medicines:      TodayMedicine[] = [];
  activity:       ActivityItem[] = [];
  notifications:  PatientNotification[] = [];

  // Animate health score ring after data loads
  animatedOffset = 283;

  constructor(
    private svc:    PatientDashboardService,
    private state:  PatientStateService,
    public  router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.svc.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.patient       = data.patient;
        this.healthScore   = data.healthScore;
        this.stats         = data.stats;
        this.appointments  = data.appointments;
        this.vitals        = data.vitals;
        this.medicines     = data.medicines;
        this.activity      = data.activity;
        this.notifications = data.notifications;
        this.loading       = false;

        // Push to shared state so layout sidebar badges update
        this.state.setPatient(data.patient);
        this.state.setStats(data.stats);

        // Animate the ring after a frame
        setTimeout(() => { this.animatedOffset = data.healthScore.strokeDashoffset; }, 50);
      },
      error: () => {
        this.loading = false;
        this.error   = 'Failed to load dashboard data. Please refresh.';
      }
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  }

  safe(html: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  medicineTimeClass(status: string): string {
    if (status === 'taken')    return 'time-taken';
    if (status === 'due')      return 'time-due';
    return 'time-upcoming';
  }

  medicineTimeLabel(m: TodayMedicine): string {
    return m.status === 'taken' ? `${m.scheduledTime} ✓` : m.scheduledTime;
  }

  apptStatusClass(status: string): string {
    if (status === 'Confirmed') return 'b-green';
    if (status === 'Cancelled') return 'b-red';
    if (status === 'Video')     return 'b-blue';
    return 'b-amber';
  }

  apptBadgeLabel(appt: PatientAppointment): string {
    if (appt.type === 'Video' && appt.status === 'Pending') return 'Video';
    return appt.status;
  }

  goToAi(query?: string) {
    const extras = query ? { queryParams: { q: query } } : {};
    this.router.navigate(['/patient/ai'], extras);
  }

  trackByActivity(_: number, item: ActivityItem): string  { return item.id; }
  trackByAppt    (_: number, a: PatientAppointment): string { return a.id; }
  trackByMed     (_: number, m: TodayMedicine): string    { return m.id; }
  trackByNotif   (_: number, n: PatientNotification): string { return n.id; }
}
