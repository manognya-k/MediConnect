import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, forkJoin, timer } from 'rxjs';
import { switchMap, takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

@Injectable({ providedIn: 'root' })
export class AdminNotificationService implements OnDestroy {
  private base = 'http://localhost:8081/api';
  private destroy$ = new Subject<void>();

  /** Whether the notification panel is open */
  panelOpen$ = new BehaviorSubject<boolean>(false);

  /** All unread notifications */
  notifications$ = new BehaviorSubject<any[]>([]);

  /** Count of unread notifications */
  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient, private auth: AdminAuthService) {
    this.startPolling();
  }

  private startPolling() {
    const userId = this.auth.getAdmin()?.id;
    if (!userId) return; // Don't poll when not authenticated
    timer(0, 60000).pipe(
      switchMap(() =>
        this.http.get<any[]>(`${this.base}/notifications/user/${userId}/unread`).pipe(
          catchError(() => of([]))
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe(notifications => {
      this.notifications$.next(notifications);
      this.unreadCount$.next(notifications.length);
    });
  }

  togglePanel() {
    this.panelOpen$.next(!this.panelOpen$.value);
  }

  closePanel() {
    this.panelOpen$.next(false);
  }

  markAsRead(notification: any) {
    const body = { ...notification, isRead: true };
    this.http.put(`${this.base}/notifications/${notification.notificationId}`, body).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      const updated = this.notifications$.value.filter(n => n.notificationId !== notification.notificationId);
      this.notifications$.next(updated);
      this.unreadCount$.next(updated.length);
    });
  }

  markAllRead() {
    const current = this.notifications$.value;
    if (!current.length) return;
    const requests = current.map(n =>
      this.http.put(`${this.base}/notifications/${n.notificationId}`, { ...n, isRead: true }).pipe(
        catchError(() => of(null))
      )
    );
    forkJoin(requests).subscribe(() => {
      this.notifications$.next([]);
      this.unreadCount$.next(0);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
