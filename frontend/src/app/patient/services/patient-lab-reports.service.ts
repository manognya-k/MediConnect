import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {
  PatientLabReport, FlaggedAlert, LabResultItem, ResultFlag, AiMessage, LabReportStatus
} from '../models/patient-lab-report.model';
import { PatientAuthService } from './patient-auth.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

// ── Result parsing helpers ─────────────────────────────────────────────────────

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

/**
 * Parse a result string like "LDL: 185 mg/dL; HDL: 52 mg/dL" into LabResultItems.
 * Accepts comma, semicolon, or newline as separators.
 * Falls back to a single "Result" row if no separator found.
 */
function parseResultString(resultStr: string, isAbnormal: boolean): LabResultItem[] {
  if (!resultStr?.trim()) return [];

  const parts = resultStr.split(/[;,\n]+/).map(s => s.trim()).filter(Boolean);

  return parts.map((part, i) => {
    // Try "Label: value unit" pattern
    const colonIdx = part.indexOf(':');
    const label  = colonIdx > -1 ? part.slice(0, colonIdx).trim() : 'Result';
    const rawVal = colonIdx > -1 ? part.slice(colonIdx + 1).trim() : part;

    // Guess abnormality from ↑ ↓ symbols or being the only value on an abnormal report
    const hasHigh = rawVal.includes('↑') || rawVal.toLowerCase().includes('high') || rawVal.toLowerCase().includes('elevated');
    const hasLow  = rawVal.includes('↓') || rawVal.toLowerCase().includes('low');
    const flag: ResultFlag =
      hasHigh ? 'HIGH' :
      hasLow  ? 'LOW'  :
      (isAbnormal && parts.length === 1) ? 'HIGH' :
      'Normal';

    return {
      id: `r${i}`,
      label,
      value: rawVal,
      normalRange: '',
      flag,
      ...flagColors(flag),
    } as LabResultItem;
  });
}

// ── Backend → frontend mapper ──────────────────────────────────────────────────

function mapBackendReport(r: any, index: number): PatientLabReport {
  const hasResult = r.result?.trim();
  const isAbnormal = Boolean(r.isAbnormal);

  const status: LabReportStatus =
    !hasResult        ? 'Pending'  :
    isAbnormal        ? 'Abnormal' :
                        'Normal';

  const iconBg =
    status === 'Abnormal' ? '#FEE2E2' :
    status === 'Normal'   ? '#E6F5EF' :
                            '#FEF3CD';
  const iconStroke =
    status === 'Abnormal' ? '#B91C1C' :
    status === 'Normal'   ? '#0F7B50' :
                            '#B45309';

  return {
    id:         String(r.reportId ?? index),
    testName:   r.testName ?? 'Lab Report',
    orderedBy:  r.doctor?.user?.name ? `Dr. ${r.doctor.user.name}` : 'Doctor',
    reportDate: r.reportDate ?? '',
    status,
    isFlagged:  isAbnormal && Boolean(hasResult),
    isExpanded: false,
    iconBg,
    iconStroke,
    results:    parseResultString(r.result ?? '', isAbnormal),
    reportFileUrl: r.reportUrl ?? undefined,
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PatientLabReportsService {
  // Cache reports so explainReport() can look them up by id
  private cachedReports: PatientLabReport[] = [];

  constructor(private http: HttpClient, private auth: PatientAuthService) {}

  getLabReports(): Observable<PatientLabReport[]> {
    const stored = this.auth.getStoredUser();
    const userId = stored?.userId ?? 0;
    return this.http.get<any>(`${BASE}/patients/by-user/${userId}`).pipe(
      catchError(() => of(null)),
      switchMap(patient => {
        if (!patient?.patientId) return of([] as PatientLabReport[]);
        return this.http.get<any[]>(`${BASE}/lab-reports/patient/${patient.patientId}`).pipe(
          map(reports => reports.map(mapBackendReport)),
          tap(reports => { this.cachedReports = reports; }),
          catchError(() => of([] as PatientLabReport[]))
        );
      })
    );
  }

  /** Build flagged alerts from real report data */
  getFlaggedAlerts(): Observable<FlaggedAlert[]> {
    if (this.cachedReports.length > 0) {
      return of(this.buildFlaggedAlerts(this.cachedReports));
    }
    return this.getLabReports().pipe(
      map(reports => this.buildFlaggedAlerts(reports))
    );
  }

  buildFlaggedAlertsFrom(reports: PatientLabReport[]): FlaggedAlert[] {
    return this.buildFlaggedAlerts(reports);
  }

  private buildFlaggedAlerts(reports: PatientLabReport[]): FlaggedAlert[] {
    return reports
      .filter(r => r.isFlagged)
      .map(r => {
        const abnormalResult = r.results.find(ri => ri.flag === 'HIGH' || ri.flag === 'LOW');
        return {
          reportId:      r.id,
          testName:      r.testName,
          flaggedMetric: abnormalResult
            ? `${abnormalResult.label.toLowerCase()} (${abnormalResult.value})`
            : 'abnormal result',
          doctorName: r.orderedBy,
        };
      });
  }

  /**
   * Ask Gemini AI to explain a specific lab report.
   * Builds a prompt with the real report data and calls /api/ai/chat.
   */
  explainReport(reportId: string): Observable<{ explanation: string }> {
    const report = this.cachedReports.find(r => r.id === reportId);

    if (!report || report.status === 'Pending') {
      const msg = report?.status === 'Pending'
        ? `The <strong>${report.testName}</strong> report is currently <strong>Pending</strong> — results have not been received yet. I'll be able to explain it once the results are in.`
        : 'Report not found. Please refresh the page.';
      return of({ explanation: msg });
    }

    // Build a rich context prompt for Gemini
    const resultsText = report.results.length > 0
      ? report.results.map(r => `${r.label}: ${r.value}${r.flag && r.flag !== 'Normal' ? ` (${r.flag})` : ''}`).join(', ')
      : 'Results available but not parsed';

    const prompt = `Please explain these lab results to the patient in plain, simple language (no jargon):

Test: ${report.testName}
Status: ${report.status}
Results: ${resultsText}
Ordered by: ${report.orderedBy}

Instructions:
- Use simple, reassuring language suitable for a non-medical reader
- Explain what each value means and whether it's concerning
- Highlight any abnormal values clearly
- Mention what the patient should discuss with their doctor
- Keep it concise (3–5 short paragraphs max)
- Do NOT use markdown headers, only use **bold** for emphasis`;

    const messages = [{ role: 'user', content: prompt }];
    const systemPrompt = 'You are MediConnect AI, a friendly health assistant explaining lab reports to patients. Use plain language, be reassuring but honest, and always recommend consulting their doctor.';

    return this.http.post<{ reply: string }>(`${BASE}/ai/chat`, { messages, systemPrompt }).pipe(
      map(res => ({ explanation: res.reply ?? 'Unable to generate explanation.' })),
      catchError(() => of({ explanation: 'AI explanation temporarily unavailable. Please try again shortly.' }))
    );
  }

  /** Send a follow-up question about lab results to real AI */
  sendAiMessage(messages: AiMessage[]): Observable<{ reply: string }> {
    const systemPrompt = 'You are MediConnect AI, a friendly health assistant helping a patient understand their lab reports. Use plain language, be reassuring, and always recommend consulting their doctor for medical decisions.';
    return this.http.post<{ reply: string }>(`${BASE}/ai/chat`, { messages, systemPrompt }).pipe(
      map(res => ({ reply: res.reply ?? 'Unable to get a response.' })),
      catchError(() => of({ reply: 'AI assistant temporarily unavailable. Please try again.' }))
    );
  }

  /** Generate and open a formatted PDF report in a new print window */
  downloadReport(reportId: string): Observable<Blob> {
    const report = this.cachedReports.find(r => r.id === reportId);
    if (!report) return throwError(() => new Error('Report not found'));

    const statusColor = report.status === 'Abnormal' ? '#B91C1C' : report.status === 'Normal' ? '#0F7B50' : '#B45309';
    const resultsRows = report.results.length > 0
      ? report.results.map(ri => {
          const flagColor = ri.flag === 'HIGH' || ri.flag === 'LOW' ? '#B91C1C' : ri.flag === 'Normal' ? '#0F7B50' : '#0D2B4E';
          return `<tr style="background:${ri.cellBg}">
            <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${ri.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:${flagColor};font-weight:600">${ri.value}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:11px;color:${flagColor}">${ri.flag !== 'Normal' ? ri.flag : ''}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="3" style="padding:12px;color:#8A94A6">No detailed results available</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lab Report - ${report.testName}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #185FA5; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 700; color: #185FA5; }
  .logo span { color: #1D9E75; }
  .row { display: flex; gap: 40px; margin-bottom: 16px; }
  .field { flex: 1; }
  .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #8A94A6; margin-bottom: 4px; }
  .val { font-size: 14px; color: #0D2B4E; font-weight: 500; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${statusColor}18; color: ${statusColor}; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #F2F4F8; padding: 8px 12px; text-align: left; font-size: 12px; color: #0D2B4E; }
  .footer { border-top: 1px solid #E5E7EB; margin-top: 40px; padding-top: 16px; font-size: 11px; color: #8A94A6; display: flex; justify-content: space-between; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header"><div class="logo">Medi<span>Connect</span></div><div style="font-size:12px;color:#8A94A6">Patient Lab Report</div></div>
<div class="row">
  <div class="field"><div class="lbl">Test Name</div><div class="val">${report.testName}</div></div>
  <div class="field"><div class="lbl">Report Date</div><div class="val">${report.reportDate}</div></div>
  <div class="field"><div class="lbl">Status</div><div class="val"><span class="badge">${report.status}</span></div></div>
</div>
<div class="row">
  <div class="field"><div class="lbl">Ordered By</div><div class="val">${report.orderedBy}</div></div>
</div>
<div style="margin-top:24px"><div class="lbl" style="margin-bottom:8px">Results</div>
<table><thead><tr><th>Test</th><th>Value</th><th>Flag</th></tr></thead><tbody>${resultsRows}</tbody></table></div>
<div style="background:#FEF3CD;border-radius:6px;padding:12px;margin-top:20px;font-size:12px;color:#854F0B">
  <strong>Disclaimer:</strong> This report is for informational purposes only. Please consult your doctor for medical advice.
</div>
<div class="footer"><span>Generated by MediConnect HMS</span><span>${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span></div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    // Return an empty blob so the Observable completes without error
    return of(new Blob([], { type: 'application/pdf' }));
  }
}
