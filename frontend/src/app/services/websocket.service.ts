import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../environments/environment';

declare const SockJS: any;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private connected = false;

  readonly prescriptionCreated$  = new Subject<any>();
  readonly prescriptionUpdated$  = new Subject<any>();
  readonly rescheduleUpdated$    = new Subject<any>();
  readonly notificationCreated$  = new Subject<any>();
  readonly medicalRecordCreated$ = new Subject<any>();
  readonly appointmentUpdated$   = new Subject<any>();

  connect(userId: number, token: string): void {
    if (this.connected || this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsBase),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        this.connected = true;
        const u = String(userId);
        this.sub(`/user/${u}/queue/prescription-created`,      d => this.prescriptionCreated$.next(d));
        this.sub(`/user/${u}/queue/prescription-updated`,      d => this.prescriptionUpdated$.next(d));
        this.sub(`/user/${u}/queue/reschedule-status-updated`, d => this.rescheduleUpdated$.next(d));
        this.sub(`/user/${u}/queue/notification-created`,      d => this.notificationCreated$.next(d));
        this.sub(`/user/${u}/queue/medical-record-created`,    d => this.medicalRecordCreated$.next(d));
        this.sub(`/user/${u}/queue/appointment-updated`,       d => this.appointmentUpdated$.next(d));
        this.sub(`/topic/reschedule-status-updated`,           d => this.rescheduleUpdated$.next(d));
      },
      onStompError: () => { this.connected = false; },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
      this.client = null;
    }
  }

  ngOnDestroy(): void { this.disconnect(); }

  private sub(destination: string, handler: (data: any) => void): void {
    this.client?.subscribe(destination, (msg: IMessage) => {
      try { handler(JSON.parse(msg.body)); } catch { handler(msg.body); }
    });
  }
}
