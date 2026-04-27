import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import {
  DashboardService,
  DoctorEntity,
  AppointmentEntity,
  LabReportEntity,
  NotificationEntity,
  BedEntity,
  InventoryEntity
} from '../../services/dashboard.service';
import { forkJoin } from 'rxjs';

interface BedGroup {
  ward: string;
  bedRange: string;
  freeCount: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss'
})
export class DoctorDashboardComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  doctorInfo: DoctorEntity | null = null;
  hospitalName = 'Central Hospital';
  departmentName = 'Cardiology';
  today = new Date();

  loading = true;
  error = '';

  totalPatients = 0;
  todayAppointmentCount = 0;
  videoCount = 0;
  inPersonCount = 0;
  pendingLabCount = 0;
  unreadNotifCount = 0;
  urgentNotifCount = 0;

  todayAppointments: AppointmentEntity[] = [];
  upcomingConsultations: AppointmentEntity[] = [];
  labReports: LabReportEntity[] = [];
  notifications: NotificationEntity[] = [];
  bedGroups: BedGroup[] = [];
  inventory: InventoryEntity[] = [];

  // Loading states per section
  apptLoading = true;
  labLoading = true;
  notifLoading = true;
  bedLoading = true;
  invLoading = true;

  // Error states per section
  apptError = '';
  labError = '';
  notifError = '';
  bedError = '';
  invError = '';

  constructor(
    public layout: LayoutService,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadDoctorInfo();
  }

  private loadDoctorInfo() {
    this.dashboardService.getAllDoctors().subscribe({
      next: (doctors) => {
        this.doctorInfo = doctors.find(
          d => d.user?.userId === this.currentUser?.userId
        ) || null;

        if (this.doctorInfo) {
          this.hospitalName = this.doctorInfo.hospital?.hospitalName || 'Central Hospital';
          this.departmentName =
            this.doctorInfo.department?.departmentName ||
            this.doctorInfo.specialization ||
            'Cardiology';
        }

        this.loadDashboardData();
      },
      error: () => {
        this.loadDashboardData();
      }
    });
  }

  private loadDashboardData() {
    const userId = this.currentUser!.userId;
    const doctorId = this.doctorInfo?.doctorId;
    const hospitalId = this.doctorInfo?.hospital?.hospitalId;

    // Total patients
    this.dashboardService.getAllPatients().subscribe(patients => {
      this.totalPatients = patients.length;
    });

    // Appointments
    if (doctorId) {
      this.dashboardService.getAppointmentsByDoctor(doctorId).subscribe({
        next: (appts) => {
          const todayStr = this.formatDateISO(this.today);
          this.todayAppointments = appts
            .filter(a => a.appointmentDate === todayStr)
            .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));

          this.todayAppointmentCount = this.todayAppointments.length;
          this.videoCount = this.todayAppointments.filter(
            a => a.appointmentType?.toUpperCase() === 'VIDEO'
          ).length;
          this.inPersonCount = this.todayAppointments.filter(
            a => a.appointmentType?.toUpperCase() === 'IN_PERSON' ||
                 a.appointmentType?.toUpperCase() === 'IN-PERSON' ||
                 a.appointmentType?.toUpperCase() === 'INPERSON'
          ).length;

          const todayDate = new Date();
          this.upcomingConsultations = appts
            .filter(a => {
              const apptDate = new Date(a.appointmentDate);
              return apptDate > todayDate;
            })
            .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
            .slice(0, 3);

          this.apptLoading = false;
        },
        error: () => {
          this.apptError = 'Failed to load appointments';
          this.apptLoading = false;
        }
      });
    } else {
      this.apptLoading = false;
    }

    // Lab reports — scoped to this doctor when possible
    this.dashboardService.getAllLabReports().subscribe({
      next: (reports) => {
        const mine = doctorId ? reports.filter(r => r.doctor?.doctorId === doctorId) : reports;
        this.labReports = mine.slice(0, 4);
        this.pendingLabCount = mine.filter(
          r => !r.result || r.result.toUpperCase() === 'PENDING'
        ).length;
        this.labLoading = false;
      },
      error: () => {
        this.labError = 'Failed to load lab reports';
        this.labLoading = false;
      }
    });

    // Notifications
    this.dashboardService.getUnreadNotifications(userId).subscribe({
      next: (notifs) => {
        this.notifications = notifs.slice(0, 3);
        this.unreadNotifCount = notifs.length;
        this.urgentNotifCount = notifs.filter(
          n => n.notificationType?.toUpperCase() === 'URGENT'
        ).length;
        this.notifLoading = false;
      },
      error: () => {
        this.notifError = 'Failed to load notifications';
        this.notifLoading = false;
      }
    });

    // Beds
    if (hospitalId) {
      this.dashboardService.getBedsByHospital(hospitalId).subscribe({
        next: (beds) => {
          this.bedGroups = this.groupBeds(beds);
          this.bedLoading = false;
        },
        error: () => {
          this.bedError = 'Failed to load bed data';
          this.bedLoading = false;
        }
      });
    } else {
      this.bedLoading = false;
    }

    // Inventory
    if (hospitalId) {
      this.dashboardService.getInventoryByHospital(hospitalId).subscribe({
        next: (items) => {
          this.inventory = items.slice(0, 4);
          this.invLoading = false;
        },
        error: () => {
          this.invError = 'Failed to load inventory';
          this.invLoading = false;
        }
      });
    } else {
      this.invLoading = false;
    }
  }

  private groupBeds(beds: BedEntity[]): BedGroup[] {
    const wardMap = new Map<string, { free: number; nums: number[] }>();
    for (const bed of beds) {
      const ward = bed.ward || 'General Ward';
      if (!wardMap.has(ward)) wardMap.set(ward, { free: 0, nums: [] });
      const entry = wardMap.get(ward)!;
      entry.nums.push(bed.bedNumber);
      if (bed.status?.toUpperCase() === 'AVAILABLE') entry.free++;
    }

    return Array.from(wardMap.entries()).slice(0, 3).map(([ward, data]) => {
      const sorted = data.nums.sort((a, b) => a - b);
      const bedRange = sorted.length > 0
        ? `Beds ${sorted[0]}-${sorted[sorted.length - 1]}`
        : 'N/A';
      return { ward, bedRange, freeCount: data.free };
    });
  }

  private formatDateISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatTime(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }

  formatUpcomingDate(dateStr: string, timeStr: string): string {
    const date = new Date(dateStr);
    const tomorrow = new Date(this.today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = dateStr === this.formatDateISO(this.today);
    const isTomorrow = dateStr === this.formatDateISO(tomorrow);

    const timeLabel = timeStr ? ` ${this.formatTime(timeStr)}` : '';

    if (isTomorrow) return `Tomorrow${timeLabel}`;
    if (isToday) return `Today${timeLabel}`;

    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${month} ${date.getDate()}${timeLabel}`;
  }

  getPatientInitials(appointment: AppointmentEntity): string {
    const name = appointment.patient?.user?.name || '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  }

  getInitialsColor(initials: string): string {
    const colors = ['#EFF6FF', '#F0FDF4', '#FFFBEB', '#FFF7ED', '#F5F3FF'];
    const textColors = ['#1D4ED8', '#15803D', '#B45309', '#C2410C', '#7C3AED'];
    const idx = (initials.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  }

  getInitialsTextColor(initials: string): string {
    const textColors = ['#1D4ED8', '#15803D', '#B45309', '#C2410C', '#7C3AED'];
    const idx = (initials.charCodeAt(0) || 0) % textColors.length;
    return textColors[idx];
  }

  getStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'CONFIRMED' || s === 'SCHEDULED') return 'badge-confirmed';
    if (s === 'COMPLETED') return 'badge-completed';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'badge-cancelled';
    return 'badge-default';
  }

  getTypeClass(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'VIDEO') return 'badge-video';
    return 'badge-inperson';
  }

  getTypeLabel(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'VIDEO') return 'Video';
    return 'In-person';
  }

  getLabResultClass(result: string): string {
    const r = (result || '').toUpperCase();
    if (r === 'ABNORMAL') return 'badge-abnormal';
    if (r === 'READY' || r === 'NORMAL') return 'badge-ready';
    if (r === 'PENDING' || !result) return 'badge-pending';
    return 'badge-default';
  }

  getNotifClass(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'URGENT') return 'notif-urgent';
    if (t === 'INFO') return 'notif-info';
    return 'notif-new';
  }

  getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor(diffMs / 60000);
    if (diffH >= 24) return `${Math.floor(diffH / 24)}d ago`;
    if (diffH >= 1) return `${diffH}h ago`;
    return `${diffM}m ago`;
  }

  getBedFreeClass(count: number): string {
    if (count === 0) return 'bed-none';
    if (count <= 2) return 'bed-low';
    return 'bed-ok';
  }

  getInventoryClass(item: InventoryEntity): string {
    if (item.quantity <= (item.reorderLevel || 10)) return 'inv-low';
    return 'inv-ok';
  }

  getUserInitials(): string {
    const name = this.currentUser?.name || 'Dr';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  joinConsultation(appt: AppointmentEntity) {
    const url = appt.sessionUrl || `https://meet.jit.si/mediconnect-${appt.appointmentId}`;
    window.open(url, '_blank');
  }

  markAllRead() {
    if (!this.notifications.length) return;
    this.notifications.forEach(n => {
      this.dashboardService.markNotificationRead(n).subscribe();
    });
    this.notifications = [];
    this.unreadNotifCount = 0;
    this.urgentNotifCount = 0;
  }

  scrollToNotifications() {
    document.getElementById('notifications-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  retrySection(section: string) {
    if (section === 'appt') { this.apptError = ''; this.apptLoading = true; }
    if (section === 'lab') { this.labError = ''; this.labLoading = true; }
    if (section === 'notif') { this.notifError = ''; this.notifLoading = true; }
    if (section === 'bed') { this.bedError = ''; this.bedLoading = true; }
    if (section === 'inv') { this.invError = ''; this.invLoading = true; }
    this.loadDashboardData();
  }
}
