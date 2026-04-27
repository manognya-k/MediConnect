export type AppointmentType = 'In-person' | 'Video';
export type AppointmentStatus = 'Confirmed' | 'Scheduled' | 'Pending' | 'Completed' | 'Cancelled';
export type AppointmentTab = 'today' | 'upcoming' | 'past';

export interface BackendAppointment {
  appointmentId: number;
  patient?: {
    patientId: number;
    user?: { userId: number; name: string; email: string };
    bloodGroup?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  doctor?: {
    doctorId: number;
    user?: { userId: number; name: string };
    specialization?: string;
    hospital?: { hospitalId: number; hospitalName: string };
  };
  hospital?: { hospitalId: number; hospitalName: string };
  appointmentDate: string;   // "YYYY-MM-DD"
  appointmentTime: string;   // "HH:MM:SS"
  status: string;            // "CONFIRMED" | "PENDING" | "CANCELLED"
  appointmentType: string;   // "VIDEO" | "IN_PERSON"
  sessionUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId?: string;
  patientName: string;
  patientCode: string;
  patientInitials: string;
  avatarBg: string;
  avatarColor: string;
  time: string;        // "09:00 AM"
  date: string;        // "YYYY-MM-DD"
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  joinUrl?: string;
  raw: BackendAppointment;
}

export interface AppointmentStats {
  todayTotal: number;
  videoCount: number;
  inPersonCount: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  confirmRate: number;
}

export interface AppointmentFilter {
  tab: AppointmentTab;
  page: number;
  pageSize: number;
  search?: string;
  type?: string;
  status?: string;
  date?: string;
}

export interface PagedAppointments {
  data: Appointment[];
  total: number;
  stats: AppointmentStats;
}
