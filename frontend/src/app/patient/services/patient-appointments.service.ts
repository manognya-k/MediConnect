import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  PatientAppointmentCard, AppointmentTab, AppointmentTabCounts,
  BookAppointmentRequest, AppointmentStatus
} from '../models/patient-appointment.model';
import { PatientAuthService } from './patient-auth.service';
import { PatientStateService } from './patient-state.service';

const BASE = 'http://localhost:8081/api';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad2(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function mapToCard(a: any, tab: AppointmentTab): PatientAppointmentCard {
  const d    = new Date(a.appointmentDate);
  const type = a.appointmentType === 'VIDEO' ? 'Video' : 'In-person';
  let status: AppointmentStatus;
  if (a.status === 'CONFIRMED' && type === 'Video') status = 'Video';
  else if (a.status === 'CONFIRMED')               status = 'Confirmed';
  else if (a.status === 'CANCELLED')               status = 'Cancelled';
  else if (a.status === 'COMPLETED')               status = 'Completed';
  else                                             status = 'Pending confirmation';
  return {
    id:         String(a.appointmentId),
    day:        String(d.getDate()),
    month:      MONTHS[d.getMonth()],
    doctorName: a.doctor?.user?.name ?? 'Doctor',
    speciality: a.doctor?.specialization ?? '',
    hospital:   a.hospital?.hospitalName ?? a.doctor?.hospital?.hospitalName ?? '',
    time:       formatTime(a.appointmentTime),
    type,
    reason:     a.notes || 'General consultation',
    status,
    tab,
    joinUrl:    a.sessionUrl ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class PatientAppointmentsService {
  constructor(
    private http: HttpClient,
    private auth: PatientAuthService,
    private state: PatientStateService
  ) {}

  private getPatientId(): Observable<number> {
    const cached = this.state.getPatient();
    if (cached?.id) return of(+cached.id);
    const userId = this.auth.getStoredUser()?.userId ?? 0;
    return this.http.get<any[]>(`${BASE}/patients`).pipe(
      map(list => list.find((p: any) => p.user?.userId === userId)?.patientId ?? 0)
    );
  }

  /** Load appointments for a given tab (filtered client-side) + tab counts */
  loadAll(): Observable<{ cards: PatientAppointmentCard[]; counts: AppointmentTabCounts }> {
    return this.getPatientId().pipe(
      switchMap(patientId => this.http.get<any[]>(`${BASE}/appointments/patient/${patientId}`)),
      map(raw => {
        const today = new Date(); today.setHours(0,0,0,0);
        const upcoming = raw.filter(a => {
          const d = new Date(a.appointmentDate);
          return d >= today && a.status !== 'CANCELLED' && a.status !== 'COMPLETED';
        }).sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
        const past = raw.filter(a => {
          const d = new Date(a.appointmentDate);
          return d < today || a.status === 'COMPLETED';
        }).sort((a,b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
        const cancelled = raw.filter(a => a.status === 'CANCELLED');

        return {
          counts: { upcoming: upcoming.length, past: past.length, cancelled: cancelled.length },
          allUpcoming:  upcoming.map(a => mapToCard(a, 'upcoming')),
          allPast:      past.map(a => mapToCard(a, 'past')),
          allCancelled: cancelled.map(a => mapToCard(a, 'cancelled')),
        };
      }),
      catchError(() => {
        // TODO: mock data fallback
        const mockUpcoming: PatientAppointmentCard[] = [
          { id:'m1', day:'22', month:'Apr', doctorName:'Dr. Sarah Johnson', speciality:'Cardiologist', hospital:'Central Hospital', time:'10:30 AM', type:'In-person', reason:'Cardiology follow-up', status:'Confirmed', tab:'upcoming' },
          { id:'m2', day:'25', month:'Apr', doctorName:'Dr. Priya Mehta', speciality:'General Physician', hospital:'City Clinic', time:'2:00 PM', type:'Video', reason:'General check-up', status:'Video', tab:'upcoming', joinUrl:'https://meet.example.com/appt-m2' },
          { id:'m3', day:'30', month:'Apr', doctorName:'Dr. Arjun Rao', speciality:'Endocrinologist', hospital:'Central Hospital', time:'11:00 AM', type:'In-person', reason:'Diabetes review', status:'Pending confirmation', tab:'upcoming' },
        ];
        const mockPast: PatientAppointmentCard[] = [
          { id:'p1', day:'15', month:'Apr', doctorName:'Dr. Sarah Johnson', speciality:'Cardiologist', hospital:'Central Hospital', time:'9:00 AM', type:'In-person', reason:'Hypertension review', status:'Completed', tab:'past' },
          { id:'p2', day:'02', month:'Apr', doctorName:'Dr. Priya Mehta', speciality:'General Physician', hospital:'City Clinic', time:'11:30 AM', type:'Video', reason:'General consultation', status:'Completed', tab:'past' },
        ];
        return of({
          counts: { upcoming: mockUpcoming.length, past: mockPast.length, cancelled: 0 },
          allUpcoming: mockUpcoming, allPast: mockPast, allCancelled: [] as PatientAppointmentCard[],
        });
      }),
      map(data => ({
        cards:  data.allUpcoming,  // default: upcoming tab
        counts: data.counts,
        _all:   { upcoming: data.allUpcoming, past: data.allPast, cancelled: data.allCancelled },
      }))
    );
  }

  /** Reschedule: PUT /api/appointments/{id} */
  reschedule(id: string, newDate: string, newTime: string, original: any): Observable<any> {
    const body = { ...original, appointmentDate: newDate, appointmentTime: newTime };
    return this.http.put(`${BASE}/appointments/${id}`, body);
  }

  /** Cancel: PUT /api/appointments/{id} with status=CANCELLED */
  cancel(id: string, original: any): Observable<any> {
    const body = { ...original, status: 'CANCELLED' };
    return this.http.put(`${BASE}/appointments/${id}`, body);
  }

  /** Book: POST /api/appointments */
  book(req: BookAppointmentRequest, patientId: number): Observable<any> {
    const body = {
      patient:         { patientId },
      doctor:          { doctorId: req.doctorId },
      hospital:        req.hospitalId ? { hospitalId: req.hospitalId } : null,
      appointmentDate: req.date,
      appointmentTime: req.time,
      appointmentType: req.type === 'Video' ? 'VIDEO' : 'IN_PERSON',
      status:          'PENDING',
      notes:           req.reason,
    };
    return this.http.post(`${BASE}/appointments`, body);
  }

  /** Fetch all doctors for Book modal */
  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/doctors`).pipe(catchError(() => of([])));
  }
}
