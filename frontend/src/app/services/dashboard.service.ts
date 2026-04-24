import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, forkJoin, map } from 'rxjs';

export interface DoctorEntity {
  doctorId: number;
  user: { userId: number; name: string; email: string; role: string; specialization?: string };
  department: { departmentId: number; departmentName: string } | null;
  hospital: { hospitalId: number; hospitalName: string; city?: string } | null;
  specialization: string;
  availabilityStatus: string;
}

export interface AppointmentEntity {
  appointmentId: number;
  patient: {
    patientId: number;
    user: { userId: number; name: string };
    bloodGroup: string;
  } | null;
  doctor: { doctorId: number } | null;
  hospital: { hospitalId: number; hospitalName: string } | null;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  appointmentType: string;
  sessionUrl: string | null;
}

export interface LabReportEntity {
  reportId: number;
  testName: string;
  result: string;
  reportDate: string;
  patient: { patientId: number; user: { name: string } } | null;
  doctor: { doctorId: number } | null;
}

export interface NotificationEntity {
  notificationId: number;
  notificationType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface BedEntity {
  bedId: number;
  ward: string;
  bedNumber: number;
  status: string;
  hospital: { hospitalId: number } | null;
  patient: { patientId: number } | null;
}

export interface InventoryEntity {
  itemId: number;
  itemName: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  hospital: { hospitalId: number } | null;
}

export interface PatientEntity {
  patientId: number;
  user: { userId: number; name: string };
  bloodGroup: string;
}

const BASE = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getAllDoctors(): Observable<DoctorEntity[]> {
    return this.http.get<DoctorEntity[]>(`${BASE}/doctors`).pipe(
      catchError(() => of([]))
    );
  }

  getAppointmentsByDoctor(doctorId: number): Observable<AppointmentEntity[]> {
    return this.http.get<AppointmentEntity[]>(`${BASE}/appointments/doctor/${doctorId}`).pipe(
      catchError(() => of([]))
    );
  }

  getAllLabReports(): Observable<LabReportEntity[]> {
    return this.http.get<LabReportEntity[]>(`${BASE}/lab-reports`).pipe(
      catchError(() => of([]))
    );
  }

  getUnreadNotifications(userId: number): Observable<NotificationEntity[]> {
    return this.http.get<NotificationEntity[]>(`${BASE}/notifications/user/${userId}/unread`).pipe(
      catchError(() => of([]))
    );
  }

  getAllNotifications(userId: number): Observable<NotificationEntity[]> {
    return this.http.get<NotificationEntity[]>(`${BASE}/notifications/user/${userId}`).pipe(
      catchError(() => of([]))
    );
  }

  getBedsByHospital(hospitalId: number): Observable<BedEntity[]> {
    return this.http.get<BedEntity[]>(`${BASE}/beds/hospital/${hospitalId}`).pipe(
      catchError(() => of([]))
    );
  }

  getInventoryByHospital(hospitalId: number): Observable<InventoryEntity[]> {
    return this.http.get<InventoryEntity[]>(`${BASE}/inventory/hospital/${hospitalId}`).pipe(
      catchError(() => of([]))
    );
  }

  getAllPatients(): Observable<PatientEntity[]> {
    return this.http.get<PatientEntity[]>(`${BASE}/patients`).pipe(
      catchError(() => of([]))
    );
  }
}
