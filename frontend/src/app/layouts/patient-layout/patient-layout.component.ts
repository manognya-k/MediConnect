import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatientAuthService } from '../../patient/services/patient-auth.service';
import { PatientStateService } from '../../patient/services/patient-state.service';
import { PatientUser, PatientDashboardStats } from '../../patient/models/patient-dashboard.model';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, ToastComponent],
  templateUrl: './patient-layout.component.html',
  styleUrl: './patient-layout.component.scss'
})
export class PatientLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  patient: PatientUser | null = null;
  stats: PatientDashboardStats | null = null;
  today = new Date();
  sidebarOpen = true;

  constructor(
    private auth: PatientAuthService,
    private state: PatientStateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.state.patient$.pipe(takeUntil(this.destroy$)).subscribe(p => this.patient = p);
    this.state.stats$.pipe(takeUntil(this.destroy$)).subscribe(s => this.stats = s);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/patient/login']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
}
