import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Hospital {
  hospitalId: number;
  hospitalName: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Department {
  departmentId: number;
  departmentName: string;
  hospital?: { hospitalId: number; hospitalName?: string };
}

export interface DoctorCreateRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  specialization: string;
  availabilityStatus: string;
  hospitalId: number | null;
  departmentId: number | null;
}

export interface AdminDoctor {
  doctorId: number;
  user: { userId: number; name: string; email: string; phone?: string; role?: string };
  specialization: string;
  availabilityStatus: string;
  department: { departmentId: number; departmentName: string } | null;
  hospital: { hospitalId: number; hospitalName: string } | null;
}

export interface AdminPatient {
  patientId: number;
  user: { userId: number; name: string; email: string; phone?: string };
  bloodGroup?: string;
  gender?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  address?: string;
}

export interface AdminBed {
  bedId: number;
  ward: string;
  bedNumber: number;
  status: string;
  hospital: { hospitalId: number; hospitalName?: string } | null;
  patient: { patientId: number } | null;
}

export interface AdminInventoryItem {
  itemId: number;
  itemName: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  hospital: { hospitalId: number; hospitalName?: string } | null;
}

export interface AdminAppointment {
  appointmentId: number;
  patient: { patientId: number; user?: { name: string } } | null;
  doctor: { doctorId: number; user?: { name: string }; specialization?: string } | null;
  hospital: { hospitalId: number; hospitalName: string } | null;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  appointmentType: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  // ── Hospitals ──
  getHospitals(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(`${this.base}/hospitals`).pipe(catchError(() => of([])));
  }

  createHospital(data: Partial<Hospital>): Observable<Hospital | null> {
    return this.http.post<Hospital>(`${this.base}/hospitals`, data).pipe(catchError(() => of(null)));
  }

  updateHospital(id: number, data: Partial<Hospital>): Observable<Hospital | null> {
    return this.http.put<Hospital>(`${this.base}/hospitals/${id}`, data).pipe(catchError(() => of(null)));
  }

  deleteHospital(id: number): Observable<boolean> {
    return this.http.delete(`${this.base}/hospitals/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ── Departments ──
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.base}/departments`).pipe(catchError(() => of([])));
  }

  getDepartmentsByHospital(hospitalId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.base}/departments/hospital/${hospitalId}`).pipe(catchError(() => of([])));
  }

  // ── Doctors ──
  getDoctors(): Observable<AdminDoctor[]> {
    return this.http.get<AdminDoctor[]>(`${this.base}/doctors`).pipe(catchError(() => of([])));
  }

  registerDoctor(data: DoctorCreateRequest): Observable<AdminDoctor | null> {
    return this.http.post<AdminDoctor>(`${this.base}/doctors/register`, data).pipe(catchError(() => of(null)));
  }

  updateDoctorFull(id: number, data: DoctorCreateRequest): Observable<AdminDoctor | null> {
    return this.http.put<AdminDoctor>(`${this.base}/doctors/${id}/update`, data).pipe(catchError(() => of(null)));
  }

  deleteDoctor(id: number): Observable<boolean> {
    return this.http.delete(`${this.base}/doctors/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ── Patients ──
  getPatients(): Observable<AdminPatient[]> {
    return this.http.get<AdminPatient[]>(`${this.base}/patients`).pipe(catchError(() => of([])));
  }

  // ── Appointments ──
  getAppointments(): Observable<AdminAppointment[]> {
    return this.http.get<AdminAppointment[]>(`${this.base}/appointments`).pipe(catchError(() => of([])));
  }

  // ── Beds ──
  getBeds(): Observable<AdminBed[]> {
    return this.http.get<AdminBed[]>(`${this.base}/beds`).pipe(catchError(() => of([])));
  }

  getBedsByHospital(hospitalId: number): Observable<AdminBed[]> {
    return this.http.get<AdminBed[]>(`${this.base}/beds/hospital/${hospitalId}`).pipe(catchError(() => of([])));
  }

  createBed(data: Partial<AdminBed>): Observable<AdminBed | null> {
    return this.http.post<AdminBed>(`${this.base}/beds`, data).pipe(catchError(() => of(null)));
  }

  updateBed(id: number, data: Partial<AdminBed>): Observable<AdminBed | null> {
    return this.http.put<AdminBed>(`${this.base}/beds/${id}`, data).pipe(catchError(() => of(null)));
  }

  deleteBed(id: number): Observable<boolean> {
    return this.http.delete(`${this.base}/beds/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ── Inventory ──
  getInventory(): Observable<AdminInventoryItem[]> {
    return this.http.get<AdminInventoryItem[]>(`${this.base}/inventory`).pipe(catchError(() => of([])));
  }

  getInventoryByHospital(hospitalId: number): Observable<AdminInventoryItem[]> {
    return this.http.get<AdminInventoryItem[]>(`${this.base}/inventory/hospital/${hospitalId}`).pipe(catchError(() => of([])));
  }

  createInventoryItem(data: Partial<AdminInventoryItem>): Observable<AdminInventoryItem | null> {
    return this.http.post<AdminInventoryItem>(`${this.base}/inventory`, data).pipe(catchError(() => of(null)));
  }

  updateInventoryItem(id: number, data: Partial<AdminInventoryItem>): Observable<AdminInventoryItem | null> {
    return this.http.put<AdminInventoryItem>(`${this.base}/inventory/${id}`, data).pipe(catchError(() => of(null)));
  }

  deleteInventoryItem(id: number): Observable<boolean> {
    return this.http.delete(`${this.base}/inventory/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ── Helpers ──
  normalizeStatus(s: string): string {
    switch (s) {
      case 'SCHEDULED': return 'Scheduled';
      case 'CONFIRMED': return 'Confirmed';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED':
      case 'CANCELED': return 'Cancelled';
      case 'AVAILABLE': return 'Available';
      case 'OCCUPIED': return 'Occupied';
      case 'MAINTENANCE': return 'Maintenance';
      default: return s;
    }
  }

  formatDate(d: string | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  formatTime(t: string): string {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  todayISO(): string {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
}
