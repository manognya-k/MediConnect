import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PatientUser, PatientHealthScore, PatientDashboardStats,
  PatientAppointment, PatientVitals, TodayMedicine,
  ActivityItem, PatientNotification
} from '../models/patient-dashboard.model';
import { PatientAuthService } from './patient-auth.service';

const BASE = 'http://localhost:8081/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatMonthDay(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr);
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name.split(' ').filter(w => w).map(w => w[0].toUpperCase()).slice(0,2).join('');
}

function patientCode(id: number): string {
  return `PT-${String(id).padStart(4,'0')}`;
}

@Injectable({ providedIn: 'root' })
export class PatientDashboardService {
  constructor(
    private http: HttpClient,
    private auth: PatientAuthService
  ) {}

  /** Load all dashboard data in parallel */
  loadAll(): Observable<{
    patient:       PatientUser;
    healthScore:   PatientHealthScore;
    stats:         PatientDashboardStats;
    appointments:  PatientAppointment[];
    vitals:        PatientVitals;
    medicines:     TodayMedicine[];
    activity:      ActivityItem[];
    notifications: PatientNotification[];
  }> {
    const stored = this.auth.getStoredUser();
    const userId = stored?.userId ?? 0;

    return forkJoin({
      patients:      this.http.get<any[]>(`${BASE}/patients`),
      appointments:  this.http.get<any[]>(`${BASE}/appointments`),
      labReports:    this.http.get<any[]>(`${BASE}/lab-reports`),
      notifications: this.http.get<any[]>(`${BASE}/notifications/user/${userId}`).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ patients, appointments, labReports, notifications }) => {

        // ── Resolve patient record ──
        const raw = patients.find((p: any) => p.user?.userId === userId);
        const patientId = raw?.patientId ?? 0;

        const patient: PatientUser = {
          id:          String(patientId),
          name:        stored?.name ?? 'Patient',
          patientCode: patientCode(patientId),
          age:         raw?.dateOfBirth ? calcAge(raw.dateOfBirth) : 0,
          gender:      raw?.gender ?? 'Unknown',
          bloodGroup:  raw?.bloodGroup ?? '—',
          initials:    getInitials(stored?.name ?? 'P'),
        };

        // ── Filter this patient's data ──
        const myAppts = appointments.filter((a: any) => a.patient?.patientId === patientId);
        const myLabs  = labReports.filter((l: any) => l.patient?.patientId === patientId);

        const today    = new Date(); today.setHours(0,0,0,0);
        const upcoming = myAppts
          .filter((a: any) => new Date(a.appointmentDate) >= today && a.status !== 'CANCELLED')
          .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

        const pendingLabs = myLabs.filter((l: any) => !l.results || l.results === '');

        const unread = notifications.filter((n: any) => !n.read);

        // ── Stats ──
        const nextAppt = upcoming[0];
        let nextDate = '—';
        if (nextAppt) {
          const nd = new Date(nextAppt.appointmentDate);
          nextDate = `${MONTHS[nd.getMonth()]} ${nd.getDate()}`;
        }

        const stats: PatientDashboardStats = {
          upcomingAppointments: upcoming.length,
          nextAppointmentDate:  nextDate,
          pendingLabReports:    pendingLabs.length,
          labReportDueToday:    pendingLabs.length > 0,
          activePrescriptions:  4,   // TODO: no prescriptions endpoint
          unreadNotifications:  unread.length || 5,
          urgentNotifications:  2,   // TODO: no urgency field in backend
        };

        // ── Upcoming appointments (top 3) ──
        const apptList: PatientAppointment[] = upcoming.slice(0,3).map((a: any) => {
          const { day, month } = formatMonthDay(a.appointmentDate);
          const docName = a.doctor?.user?.name ?? 'Doctor';
          const spec    = a.doctor?.specialization ?? '';
          const hosp    = a.doctor?.hospital?.hospitalName ?? '';
          const type    = a.appointmentType === 'VIDEO' ? 'Video' : 'In-person';
          const status  = a.status === 'CONFIRMED' ? 'Confirmed'
                        : a.status === 'CANCELLED' ? 'Cancelled' : 'Pending';
          return {
            id: String(a.appointmentId),
            day, month,
            doctorName: docName,
            speciality: spec,
            hospital: hosp,
            time: formatTime(a.appointmentTime),
            type,
            status,
          } as PatientAppointment;
        });

        // Fill with mock if no real data
        const mockAppts: PatientAppointment[] = apptList.length > 0 ? apptList : [
          { id:'m1', day:'22', month:'Apr', doctorName:'Dr. Sarah Johnson', speciality:'Cardiologist', hospital:'Central Hospital', time:'10:30 AM', type:'In-person', status:'Confirmed' },
          { id:'m2', day:'25', month:'Apr', doctorName:'Dr. Priya Mehta', speciality:'General Physician', hospital:'City Clinic', time:'02:00 PM', type:'Video', status:'Pending' },
          { id:'m3', day:'30', month:'Apr', doctorName:'Dr. Arjun Rao', speciality:'Endocrinologist', hospital:'Central Hospital', time:'11:00 AM', type:'In-person', status:'Pending' },
        ];

        // ── Health Score (mock — no endpoint) ──
        // TODO: wire to backend health score endpoint
        const score = 80;
        const healthScore: PatientHealthScore = {
          score,
          status: 'Good',
          strokeDashoffset: 283 - (score / 100 * 283),
        };

        // ── Vitals (mock — no endpoint) ──
        // TODO: wire to backend vitals endpoint
        const vitals: PatientVitals = {
          bloodPressure: '138/88 mmHg', bloodPressureColor: '#B45309',
          bloodPressurePercent: 72, bloodPressureBar: 'linear-gradient(90deg,#F59E0B,#EF4444)',
          heartRate: '74 bpm', heartRateColor: '#0F7B50',
          heartRatePercent: 55, heartRateBar: '#0F7B50',
          bloodGlucose: '112 mg/dL', bloodGlucoseColor: '#B45309',
          bloodGlucosePercent: 65, bloodGlucoseBar: 'linear-gradient(90deg,#22C55E,#F59E0B)',
          bmi: '24.2', bmiColor: '#0D1B2A',
          bmiPercent: 48, bmiBar: '#2272C3',
          lastUpdated: 'Apr 18',
        };

        // ── Today's medicines (mock — no endpoint) ──
        // TODO: wire to backend medicines/prescriptions endpoint
        const medicines: TodayMedicine[] = [
          { id:'1', name:'Amlodipine 5mg', dosage:'1 tablet · After meals', scheduledTime:'8:00 AM', status:'taken' },
          { id:'2', name:'Metformin 500mg', dosage:'1 tablet · With food', scheduledTime:'2:00 PM', status:'due' },
        ];

        // ── Recent activity (mock — no endpoint) ──
        // TODO: wire to backend activity feed endpoint
        const activity: ActivityItem[] = [
          { id:'1', text:'Lab report received — <strong>Lipid Panel</strong> results ready', timeAgo:'2 hours ago', dotColor:'#2272C3' },
          { id:'2', text:'Appointment confirmed with <strong>Dr. Sarah Johnson</strong>', timeAgo:'Yesterday, 4:30 PM', dotColor:'#0F7B50' },
          { id:'3', text:'Prescription updated — <strong>Amlodipine dosage</strong> adjusted', timeAgo:'Apr 18, 11:00 AM', dotColor:'#B45309' },
          { id:'4', text:'Medical record added — <strong>Cardiology Review</strong>', timeAgo:'Apr 15, 9:00 AM', dotColor:'#8A94A6' },
        ];

        // ── Notifications from real endpoint or mock ──
        const notifList: PatientNotification[] = notifications.slice(0,3).map((n: any, i: number) => ({
          id: String(n.notificationId ?? i),
          message: n.message ?? n.title ?? 'Notification',
          timeAgo: 'Recently',
          iconBg: '#E8F2FD',
          iconStroke: '#1A5FA8',
          iconType: 'bell' as const,
        }));

        const mockNotifs: PatientNotification[] = [
          { id:'n1', message:'<strong>Lab result flagged</strong> — Lipid panel shows elevated LDL', timeAgo:'2h ago · Urgent', iconBg:'#FEE2E2', iconStroke:'#B91C1C', iconType:'warning' },
          { id:'n2', message:'Appointment reminder — <strong>Dr. Johnson</strong> tomorrow 10:30 AM', timeAgo:'5h ago', iconBg:'#E8F2FD', iconStroke:'#1A5FA8', iconType:'calendar' },
          { id:'n3', message:'Medicine reminder — <strong>Metformin 500mg</strong> due at 2:00 PM', timeAgo:'Just now', iconBg:'#FEF3CD', iconStroke:'#B45309', iconType:'bell' },
        ];

        return {
          patient,
          healthScore,
          stats,
          appointments: mockAppts,
          vitals,
          medicines,
          activity,
          notifications: notifList.length > 0 ? notifList : mockNotifs,
        };
      })
    );
  }
}
