export type SessionStatus = 'Live' | 'Upcoming' | 'Scheduled' | 'Completed' | 'No-show' | 'Cancelled';

export interface TelemedicineSession {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientInitials: string;
  doctorName: string;
  doctorCode: string;
  doctorInitials: string;
  doctorSpecialization: string;
  avatarBg: string;
  avatarColor: string;
  reason: string;
  scheduledTime: string;        // ISO datetime string
  scheduledDate: string;        // 'YYYY-MM-DD'
  scheduledTimeDisplay: string; // '09:00 AM'
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  bloodGroup: string;
  status: SessionStatus;
  joinUrl?: string;
  startedAt?: string;           // ISO datetime — only for Live sessions
}

export interface TelemedicineStats {
  liveNow: number;
  todayTotal: number;
  todayRemaining: number;
  thisWeekTotal: number;
  weeklyChangePercent: number;
  avgDurationMinutes: number;
}

export interface PagedSessions {
  data: TelemedicineSession[];
  total: number;
}
