import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { filter, takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PatientAuthService } from '../../patient/services/patient-auth.service';
import { PatientStateService } from '../../patient/services/patient-state.service';
import { PatientUser, PatientDashboardStats } from '../../patient/models/patient-dashboard.model';
import { ToastComponent } from '../../components/toast/toast.component';
import { WebSocketService } from '../../services/websocket.service';

const BASE = 'http://localhost:8081/api';

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
  userId: number | null = null;

  constructor(
    private auth:  PatientAuthService,
    private state: PatientStateService,
    private router: Router,
    private route:  ActivatedRoute,
    private ws: WebSocketService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const stored = this.auth.getStoredUser();
    this.userId = stored?.userId ?? null;
    if (stored?.userId && stored?.token) {
      try { this.ws.connect(stored.userId, stored.token); } catch { /* ws optional */ }
    }
    this.state.patient$.pipe(takeUntil(this.destroy$)).subscribe(p => this.patient = p);
    this.state.stats$.pipe(takeUntil(this.destroy$)).subscribe(s => this.stats = s);

    // If state was never populated (direct navigation), show name from auth token
    // immediately, then enrich with full patient profile from the API
    if (!this.state.getPatient() && stored) {
      // Immediate placeholder so the sidebar is never blank
      const storedName    = stored.name ?? '';
      const storedInitials = storedName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
      this.state.setPatient({
        id: String(stored.userId),
        name: storedName,
        patientCode: '',
        age: 0,
        gender: '',
        bloodGroup: '',
        initials: storedInitials,
      });

      // Enrich with full patient profile
      this.http.get<any>(`${BASE}/patients/by-user/${stored.userId}`)
        .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
        .subscribe(p => {
          if (!p) return;
          const name: string = p.user?.name ?? storedName;
          const dob = p.dateOfBirth;
          let age = 0;
          if (dob) {
            // dob may be ISO string "2000-05-15" or array [2000,5,15]
            const dobDate = Array.isArray(dob)
              ? new Date(dob[0], dob[1] - 1, dob[2])
              : new Date(dob);
            age = Math.floor((Date.now() - dobDate.getTime()) / 3.15576e10);
            if (isNaN(age) || age < 0) age = 0;
          }
          const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          this.state.setPatient({
            id:          String(p.patientId),
            name,
            patientCode: `P${String(p.patientId).padStart(4, '0')}`,
            age,
            gender:      p.gender ?? '',
            bloodGroup:  p.bloodGroup ?? '',
            initials,
          });
        });
    }

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.ws.disconnect();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  nav(commands: string[]): (string | number)[] {
    return this.userId ? ['/patient', this.userId, ...commands] : ['/login'];
  }
}
