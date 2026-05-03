import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PatientLabReport, FlaggedAlert, LabResultItem, ResultFlag, AiMessage
} from '../models/patient-lab-report.model';

const BASE = 'http://localhost:8081/api';

function flagColors(flag: ResultFlag): { valueColor: string; cellBg: string; flagColor: string } {
  switch (flag) {
    case 'HIGH':
    case 'LOW':
      return { valueColor: '#B91C1C', cellBg: '#FEE2E2', flagColor: '#B91C1C' };
    case 'Borderline':
    case 'Slightly High':
      return { valueColor: '#B45309', cellBg: '#FEF3CD', flagColor: '#B45309' };
    case 'Normal':
      return { valueColor: '#0F7B50', cellBg: '#F2F4F8', flagColor: '#0F7B50' };
    default:
      return { valueColor: '#0D2B4E', cellBg: '#F2F4F8', flagColor: '#8A94A6' };
  }
}

function makeResult(
  id: string, label: string, value: string, normalRange: string, flag: ResultFlag
): LabResultItem {
  return { id, label, value, normalRange, flag, ...flagColors(flag) };
}

// ── Mock data (TODO: replace with real API calls) ──────────────────────────────

const MOCK_REPORTS: PatientLabReport[] = [
  {
    id: 'lr1',
    testName: 'Lipid Panel',
    orderedBy: 'Dr. Sarah Johnson',
    reportDate: '2026-04-18',
    status: 'Abnormal',
    isFlagged: true,
    isExpanded: false,
    iconBg: '#FEE2E2',
    iconStroke: '#B91C1C',
    results: [
      makeResult('r1', 'LDL Cholesterol',  '185 mg/dL ↑',  'Normal: < 100 mg/dL', 'HIGH'),
      makeResult('r2', 'HDL Cholesterol',  '52 mg/dL',     'Normal: > 40 mg/dL',  'Normal'),
      makeResult('r3', 'Triglycerides',    '172 mg/dL ↑',  'Normal: < 150 mg/dL', 'Borderline'),
      makeResult('r4', 'Total Cholesterol','241 mg/dL',    'Normal: < 200 mg/dL', 'Borderline'),
      makeResult('r5', 'VLDL',             '34 mg/dL',     'Normal: 2–30 mg/dL',  'Slightly High'),
      makeResult('r6', 'Non-HDL Chol',     '189 mg/dL',    'Normal: < 130 mg/dL', 'HIGH'),
    ],
  },
  {
    id: 'lr2',
    testName: 'ECG Analysis',
    orderedBy: 'Dr. Sarah Johnson',
    reportDate: '2026-04-16',
    status: 'Normal',
    isFlagged: false,
    isExpanded: false,
    iconBg: '#E6F5EF',
    iconStroke: '#0F7B50',
    results: [
      makeResult('r7', 'Rhythm',      'Normal sinus rhythm', '',                   'Normal'),
      makeResult('r8', 'Heart Rate',  '74 bpm',              'Normal: 60–100',      'Normal'),
      makeResult('r9', 'PR Interval', '162 ms',              'Normal: 120–200 ms',  null),
    ],
  },
  {
    id: 'lr3',
    testName: 'HbA1c Test',
    orderedBy: 'Dr. Arjun Rao',
    reportDate: '2026-04-20',
    status: 'Pending',
    isFlagged: false,
    isExpanded: false,
    iconBg: '#FEF3CD',
    iconStroke: '#B45309',
    results: [],
  },
];

const MOCK_FLAGGED: FlaggedAlert[] = [
  {
    reportId: 'lr1',
    testName: 'Lipid Panel',
    flaggedMetric: 'elevated LDL cholesterol (185 mg/dL)',
    doctorName: 'Dr. Johnson',
  },
];

const MOCK_EXPLANATION =
  `Your <strong>Lipid Panel</strong> results show an <span class="flag">elevated LDL of 185 mg/dL</span> ` +
  `— this is the "bad" cholesterol that can build up in your arteries. ` +
  `The normal range is below 100 mg/dL for people with heart risk factors like yours.<br><br>` +
  `Your <strong>HDL (52 mg/dL)</strong> is good — this is the "protective" cholesterol. ` +
  `However, your <span class="flag">Triglycerides at 172 mg/dL</span> are slightly above the healthy threshold of 150.<br><br>` +
  `<strong>What this means:</strong> Your doctor will likely discuss starting a statin medication ` +
  `and recommending a low-saturated-fat diet.`;

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PatientLabReportsService {
  constructor(private http: HttpClient) {}

  /** Load all lab reports (TODO: GET /api/lab-reports filtered by patient) */
  getLabReports(): Observable<PatientLabReport[]> {
    // TODO: wire to GET /api/lab-reports?patientId=... or /api/patient/lab-reports
    return of(MOCK_REPORTS);
  }

  /** Load flagged alert banners (TODO: GET /api/patient/lab-reports/flagged) */
  getFlaggedAlerts(): Observable<FlaggedAlert[]> {
    // TODO: wire to backend flagged reports endpoint
    return of(MOCK_FLAGGED);
  }

  /** Download PDF blob (TODO: GET /api/patient/lab-reports/:id/download) */
  downloadReport(reportId: string): Observable<Blob> {
    // TODO: wire to GET /api/patient/lab-reports/:id/download
    return this.http.get(`${BASE}/patient/lab-reports/${reportId}/download`, {
      responseType: 'blob',
    }).pipe(
      catchError(() => { throw new Error('Download not available'); })
    );
  }

  /** AI: explain a specific report (TODO: POST /api/patient/ai/explain-report) */
  explainReport(reportId: string, question?: string): Observable<{ explanation: string }> {
    // TODO: wire to POST /api/patient/ai/explain-report
    return of({ explanation: MOCK_EXPLANATION });
  }

  /** AI: continue chat (TODO: POST /api/patient/ai/chat) */
  sendAiMessage(messages: AiMessage[]): Observable<{ reply: string }> {
    // TODO: wire to POST /api/patient/ai/chat
    const last = messages[messages.length - 1]?.content ?? '';
    if (last.toLowerCase().includes('ldl') || last.toLowerCase().includes('cholesterol')) {
      return of({ reply: 'LDL ("bad") cholesterol builds up in artery walls and can increase the risk of heart disease. Levels below 100 mg/dL are generally considered optimal. Your reading of 185 mg/dL is elevated and worth discussing with Dr. Johnson.' });
    }
    if (last.toLowerCase().includes('statin')) {
      return of({ reply: 'Statins are a class of medication that lower LDL cholesterol by reducing its production in the liver. They are commonly prescribed when LDL is elevated and other cardiovascular risk factors are present. Your doctor will determine if this is appropriate for you.' });
    }
    return of({ reply: 'That\'s a great question about your lab results. Based on what I can see, I recommend discussing this with Dr. Johnson at your next appointment. They can give you personalised advice based on your complete medical history.' });
  }
}
