import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendMedicalRecord, MedicalRecord, PatientSummary, RecordStatus } from '../models/medical-record.model';

const BASE = 'http://localhost:8081/api';

const AVATAR_COLORS = [
  { bg: '#EBF3FC', color: '#185FA5' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FEF3CD', color: '#854F0B' },
  { bg: '#FDECEC', color: '#A32D2D' },
  { bg: '#F3EEFF', color: '#5B21B6' },
  { bg: '#FFF0F6', color: '#9D174D' },
];

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function avatarFor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function deriveStatus(r: BackendMedicalRecord): RecordStatus {
  const diag = (r.diagnosis || '').toLowerCase();
  if (diag.includes('critical')) return 'Critical';
  if (diag.includes('chronic') || diag.includes('ongoing')) return 'Ongoing';
  if (r.treatment && r.treatment.trim().length > 0) return 'Treated';
  return 'Active';
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<BackendMedicalRecord[]> {
    return this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records`);
  }

  getByPatient(patientId: number): Observable<BackendMedicalRecord[]> {
    return this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records/patient/${patientId}`);
  }

  getByDoctor(doctorId: number): Observable<BackendMedicalRecord[]> {
    return this.http.get<BackendMedicalRecord[]>(`${BASE}/medical-records/doctor/${doctorId}`);
  }

  create(body: any): Observable<BackendMedicalRecord> {
    return this.http.post<BackendMedicalRecord>(`${BASE}/medical-records`, body);
  }

  update(id: number, body: any): Observable<BackendMedicalRecord> {
    return this.http.put<BackendMedicalRecord>(`${BASE}/medical-records/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/medical-records/${id}`);
  }

  mapToUI(r: BackendMedicalRecord, index: number): MedicalRecord {
    const name = r.patient?.user?.name || 'Unknown';
    const av = avatarFor(index);
    return {
      recordId: r.recordId,
      patientId: r.patient?.patientId ?? 0,
      patientName: name,
      patientInitials: initials(name),
      avatarBg: av.bg,
      avatarColor: av.color,
      dateOfBirth: formatDate(r.patient?.dateOfBirth),
      gender: r.patient?.gender || '—',
      bloodGroup: r.patient?.bloodGroup || '—',
      recordDate: formatDate(r.recordDate),
      diagnosis: r.diagnosis || '—',
      treatment: r.treatment || '—',
      prescription: r.prescription || '',
      notes: r.notes || '',
      status: deriveStatus(r),
    };
  }

  buildPatientList(records: BackendMedicalRecord[]): PatientSummary[] {
    const map = new Map<number, { records: BackendMedicalRecord[]; index: number }>();
    records.forEach(r => {
      const pid = r.patient?.patientId;
      if (!pid) return;
      if (!map.has(pid)) map.set(pid, { records: [], index: map.size });
      map.get(pid)!.records.push(r);
    });

    const summaries: PatientSummary[] = [];
    map.forEach(({ records: recs, index }, pid) => {
      const sorted = [...recs].sort((a, b) =>
        new Date(b.recordDate || 0).getTime() - new Date(a.recordDate || 0).getTime()
      );
      const latest = sorted[0];
      const name = latest.patient?.user?.name || 'Unknown';
      const av = avatarFor(index);
      summaries.push({
        patientId: pid,
        name,
        initials: initials(name),
        avatarBg: av.bg,
        avatarColor: av.color,
        lastVisit: formatDate(latest.recordDate),
        recordCount: recs.length,
        latestDiagnosis: latest.diagnosis || '—',
        status: deriveStatus(latest),
      });
    });

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }
}
