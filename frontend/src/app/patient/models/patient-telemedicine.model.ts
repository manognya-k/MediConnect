export type SessionType   = 'Video' | 'In-person';
export type SessionStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'No-show';

export interface NextSession {
  sessionId: string;
  doctorName: string;
  doctorRole: string;
  clinic: string;
  doctorInitials: string;
  scheduledAt: string;           // ISO datetime
  durationEstMinutes: number;
  minutesUntilStart: number;     // computed on frontend
  joinUrl?: string;
}

export interface ScheduledSession {
  sessionId: string;
  doctorName: string;
  doctorRole: string;
  clinic: string;
  doctorInitials: string;
  avatarBg: string;
  avatarColor: string;
  scheduledAt: string;           // ISO datetime
  sessionType: SessionType;
  reason: string;
  durationEstMinutes: number;
  status: SessionStatus;
  joinUrl?: string;
  // Computed on frontend
  timeUntilLabel: string;
  timeBadgeClass: string;
}

export interface PastSession {
  sessionId: string;
  doctorName: string;
  sessionDate: string;           // ISO datetime
  sessionType: SessionType;
  durationMinutes: number;       // 0 means N/A (show "—")
  reason: string;
  status: 'Completed' | 'No-show' | 'Cancelled';
}
