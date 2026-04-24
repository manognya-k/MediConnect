export interface PatientUser {
  id: string;
  name: string;
  patientCode: string;
  age: number;
  gender: string;
  bloodGroup: string;
  initials: string;
}

export interface PatientHealthScore {
  score: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  strokeDashoffset: number;
}

export interface PatientDashboardStats {
  upcomingAppointments: number;
  nextAppointmentDate: string;
  pendingLabReports: number;
  labReportDueToday: boolean;
  activePrescriptions: number;
  unreadNotifications: number;
  urgentNotifications: number;
}

export interface PatientAppointment {
  id: string;
  day: string;
  month: string;
  doctorName: string;
  speciality: string;
  hospital: string;
  time: string;
  type: 'In-person' | 'Video';
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export interface PatientVitals {
  bloodPressure: string;
  bloodPressureColor: string;
  bloodPressurePercent: number;
  bloodPressureBar: string;
  heartRate: string;
  heartRateColor: string;
  heartRatePercent: number;
  heartRateBar: string;
  bloodGlucose: string;
  bloodGlucoseColor: string;
  bloodGlucosePercent: number;
  bloodGlucoseBar: string;
  bmi: string;
  bmiColor: string;
  bmiPercent: number;
  bmiBar: string;
  lastUpdated: string;
}

export type MedicineStatus = 'taken' | 'due' | 'upcoming';

export interface TodayMedicine {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  status: MedicineStatus;
}

export interface ActivityItem {
  id: string;
  text: string;
  timeAgo: string;
  dotColor: string;
}

export type NotificationIconType = 'warning' | 'calendar' | 'bell';

export interface PatientNotification {
  id: string;
  message: string;
  timeAgo: string;
  iconBg: string;
  iconStroke: string;
  iconType: NotificationIconType;
}
