export interface BackendPatient {
  patientId: number;
  user: {
    userId: number;
    name: string;
    email: string;
    role: string;
    bloodGroup?: string;
    gender?: string;
    dateOfBirth?: string;
    specialization?: string;
    phone?: string;
  };
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  diagnosis: string;
  lastVisit: string;
  status: 'Active' | 'Monitoring' | 'Critical' | 'Inactive';
  initials: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  rawId: number;
}

export interface PatientStats {
  total: number;
  activeThisWeek: number;
  criticalCases: number;
  newThisMonth: number;
  totalToday: number;
  increasePercent: number;
}

export interface PatientFilter {
  page: number;
  pageSize: number;
  search: string;
  gender: string;
  bloodGroup: string;
  status: string;
}

export function mapBackendPatient(bp: BackendPatient, index: number): Patient {
  const name = bp.user?.name || 'Unknown';
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const initials = (firstName[0] || '') + (lastName[0] || firstName[1] || '');

  const dob = bp.dateOfBirth || bp.user?.dateOfBirth;
  let age = 0;
  if (dob) {
    const birth = new Date(dob);
    const today = new Date();
    age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  }

  const statusOptions: Patient['status'][] = ['Active', 'Monitoring', 'Critical', 'Inactive'];
  // Deterministic pseudo-status for demo — backend has no status field
  // TODO: wire to real status field when backend adds it
  const status = statusOptions[index % 4 === 3 ? 3 : index % 4 === 2 && index % 7 === 0 ? 2 : 0];

  return {
    id: String(bp.patientId),
    rawId: bp.patientId,
    patientCode: 'PT-' + String(bp.patientId).padStart(4, '0'),
    firstName,
    lastName,
    fullName: name,
    age,
    gender: bp.gender || bp.user?.gender || '—',
    bloodGroup: bp.bloodGroup || bp.user?.bloodGroup || '—',
    diagnosis: '—',        // TODO: fetch from medical records endpoint
    lastVisit: '',         // TODO: fetch from appointments endpoint
    status,
    initials: initials.toUpperCase() || '??',
    email: bp.user?.email,
    address: bp.address,
    emergencyContact: bp.emergencyContact,
    dateOfBirth: dob,
  };
}
