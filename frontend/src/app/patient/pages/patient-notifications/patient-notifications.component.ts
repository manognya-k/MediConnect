import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface Notification {
  notificationId: number;
  notificationType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-patient-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-notifications.component.html',
  styleUrl: './patient-notifications.component.scss'
})
export class PatientNotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = true;
  markingAllRead = false;
  private userId: number | null = null;
  private destroy$ = new Subject<void>();
  private base = environment.apiBase;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userId = user?.userId ?? null;
    if (this.userId) this.loadNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications() {
    if (!this.userId) return;
    this.loading = true;
    this.http.get<Notification[]>(`${this.base}/notifications/user/${this.userId}`)
      .pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe(data => {
        this.notifications = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
      });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  markRead(n: Notification) {
    if (n.isRead) return;
    this.http.patch(`${this.base}/notifications/${n.notificationId}/read`, {})
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(() => { n.isRead = true; });
  }

  markAllRead() {
    if (!this.userId || this.unreadCount === 0) return;
    this.markingAllRead = true;
    this.http.put(`${this.base}/notifications/read-all/${this.userId}`, {})
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.forEach(n => n.isRead = true);
        this.markingAllRead = false;
      });
  }

  typeIcon(type: string): string {
    const t = (type ?? '').toUpperCase();
    if (t.includes('APPOINTMENT')) return '📅';
    if (t.includes('RESCHEDULE'))  return '🔄';
    if (t.includes('LAB'))         return '🧪';
    if (t.includes('PRESCRIPTION')) return '💊';
    return '🔔';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days > 0)  return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0)  return `${mins}m ago`;
    return 'Just now';
  }
}
