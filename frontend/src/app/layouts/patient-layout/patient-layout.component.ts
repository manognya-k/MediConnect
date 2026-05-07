import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
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
  pageTitle    = 'Health Overview';
  pageSubtitle: string | null = null;

  constructor(
    private auth:  PatientAuthService,
    private state: PatientStateService,
    private router: Router,
    private route:  ActivatedRoute
  ) {}

  ngOnInit() {
    this.state.patient$.pipe(takeUntil(this.destroy$)).subscribe(p => this.patient = p);
    this.state.stats$.pipe(takeUntil(this.destroy$)).subscribe(s => this.stats = s);

    // Update topbar title/subtitle on every child-route navigation
    this.readRouteTitle();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.readRouteTitle());
  }

  private readRouteTitle() {
    let child = this.route.firstChild;
    while (child?.firstChild) child = child.firstChild;
    const data = child?.snapshot.data ?? {};
    this.pageTitle    = data['title']    ?? 'Health Overview';
    this.pageSubtitle = data['subtitle'] ?? null;
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
}
