export type AppointmentTab    = 'upcoming' | 'past' | 'cancelled';
export type AppointmentType   = 'In-person' | 'Video';
export type AppointmentStatus = 'Confirmed' | 'Pending confirmation' | 'Completed' | 'Cancelled' | 'Video';

export interface PatientAppointmentCard {
  id: string;
  day: string;
  month: string;
  doctorName: string;
  speciality: string;
  hospital: string;
  time: string;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  tab: AppointmentTab;
  joinUrl?: string;
}

export interface AppointmentTabCounts {
  upcoming: number;
  past: number;
  cancelled: number;
}

export interface BookAppointmentRequest {
  doctorId: number;
  date: string;
  time: string;
  type: AppointmentType;
  reason: string;
  hospitalId?: number;
}
