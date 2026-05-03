import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AiMode, ConversationTurn, PatientAiContext } from '../models/patient-ai.model';
import { PatientStateService } from './patient-state.service';

const BASE = 'http://localhost:8081/api';

// ── Mock context fallback ─────────────────────────────────────────────────────

function buildMockContext(state: PatientStateService): PatientAiContext {
  const p = state.getPatient();
  return {
    patientName:     p?.name        ?? 'Patient',
    patientId:       p?.patientCode ?? 'PT-0000',
    age:             p?.age         ?? 0,
    gender:          p?.gender      ?? 'Unknown',
    bloodGroup:      p?.bloodGroup  ?? 'Unknown',
    conditions:      ['Hypertension Stage 1', 'Type 2 Diabetes'],
    prescriptions:   [
      'Amlodipine 5mg (morning)',
      'Metformin 500mg (2× daily)',
      'Aspirin 75mg (morning)',
      'Lisinopril 10mg (evening)'
    ],
    labFlags:        ['LDL 185 mg/dL (elevated)', 'Triglycerides 172 mg/dL (borderline)'],
    nextAppointment: 'Dr. Aisha Patel, cardiology follow-up'
  };
}

@Injectable({ providedIn: 'root' })
export class PatientAiService {

  private cachedContext: PatientAiContext | null = null;

  constructor(
    private http:  HttpClient,
    private state: PatientStateService
  ) {}

  // ── Patient context ───────────────────────────────────────────────────────

  /** TODO: wire to GET /api/patient/ai/context */
  getPatientContext(): Observable<PatientAiContext> {
    // Use mock until backend provides the endpoint
    const ctx = buildMockContext(this.state);
    this.cachedContext = ctx;
    return of(ctx);
  }

  getCachedContext(): PatientAiContext | null { return this.cachedContext; }

  // ── System prompt ─────────────────────────────────────────────────────────

  buildSystemPrompt(ctx: PatientAiContext, mode: AiMode): string {
    const modeInstruction =
      mode === 'symptom' ? 'SYMPTOM CHECKER MODE: Focus on understanding and triaging symptoms. Always recommend professional consultation for anything concerning.' :
      mode === 'report'  ? 'REPORT EXPLANATION MODE: Explain medical terms and lab values in simple, reassuring language.' :
      mode === 'booking' ? 'APPOINTMENT BOOKING MODE: Help the patient identify the right specialist and suggest appropriate timing.' :
      '';

    const lines = [
      `You are MediConnect AI, a personal health assistant for ${ctx.patientName} (Patient ${ctx.patientId}, Age ${ctx.age}, ${ctx.gender}, ${ctx.bloodGroup} blood group).`,
      '',
      modeInstruction,
      `Active conditions: ${ctx.conditions.join(', ')}.`,
      `Active prescriptions: ${ctx.prescriptions.join(', ')}.`,
      ctx.labFlags.length > 0 ? `Recent lab flags: ${ctx.labFlags.join(', ')}.` : '',
      ctx.nextAppointment ? `Upcoming appointment: ${ctx.nextAppointment}.` : '',
      '',
      'You can help with:',
      '1. Symptom checking — provide initial guidance, always recommend seeing a doctor.',
      '2. Explaining lab reports and medical terms in simple language.',
      '3. Helping book appointments by suggesting the right specialist.',
      '4. General health questions based on their conditions.',
      '',
      'Be warm, clear, and concise. Use plain language. Always recommend professional consultation for serious concerns. Never diagnose definitively.'
    ];
    return lines.filter(l => l !== undefined).join('\n');
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  /** Calls backend proxy at POST /api/ai/chat */
  sendMessage(messages: ConversationTurn[], mode: AiMode): Observable<string> {
    const ctx = this.cachedContext ?? buildMockContext(this.state);
    const systemPrompt = this.buildSystemPrompt(ctx, mode);

    return this.http.post<{ reply: string }>(`${BASE}/ai/chat`, { messages, systemPrompt }).pipe(
      map(res => res.reply || 'No response received.'),
      catchError(() => of('Connection error. Please check your network and try again.'))
    );
  }
}
