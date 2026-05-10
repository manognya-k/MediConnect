import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AiMode, ConversationTurn, PatientAiContext } from '../models/patient-ai.model';
import { PatientStateService } from './patient-state.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class PatientAiService {
  private cachedContext: PatientAiContext | null = null;

  constructor(private state: PatientStateService, private http: HttpClient) {}

  getPatientContext(): Observable<PatientAiContext> {
    const p = this.state.getPatient();
    if (!p?.id) {
      const fallback: PatientAiContext = {
        patientName: p?.name ?? 'Patient',
        patientId: p?.patientCode ?? '',
        age: p?.age ?? 0,
        gender: p?.gender ?? '',
        bloodGroup: p?.bloodGroup ?? '',
        conditions: [],
        prescriptions: [],
        labFlags: [],
        nextAppointment: 'No upcoming appointments'
      };
      this.cachedContext = fallback;
      return of(fallback);
    }

    return forkJoin({
      medicines: this.http.get<any[]>(`${BASE}/patients/${p.id}/medicines`).pipe(catchError(() => of([]))),
      appointments: this.http.get<any[]>(`${BASE}/appointments/patient/${p.id}`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ medicines, appointments }) => {
        const today = new Date();
        const nextAppt = appointments
          .filter((a: any) => new Date(a.appointmentDate) >= today && a.status !== 'CANCELLED')
          .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0];

        const ctx: PatientAiContext = {
          patientName: p.name ?? 'Patient',
          patientId: p.patientCode ?? '',
          age: p.age ?? 0,
          gender: p.gender ?? '',
          bloodGroup: p.bloodGroup ?? '',
          conditions: [],
          prescriptions: medicines.map((m: any) => `${m.medicineName} ${m.dosage} (${m.frequency})`),
          labFlags: [],
          nextAppointment: nextAppt
            ? `${nextAppt.doctor?.user?.name ?? 'Doctor'}, ${nextAppt.doctor?.specialization ?? 'Specialist'}`
            : 'No upcoming appointments'
        };
        this.cachedContext = ctx;
        return ctx;
      })
    );
  }

  getCachedContext(): PatientAiContext | null { return this.cachedContext; }

  sendMessage(messages: ConversationTurn[], mode: AiMode): Observable<string> {
    const systemPrompt = this.buildSystemPrompt(mode);
    return this.http.post<{ reply: string }>(`${BASE}/ai/chat`, { messages, systemPrompt }).pipe(
      map(res => res.reply ?? 'No response received.'),
      catchError(() => throwError(() => new Error('Connection error. Please check your network.')))
    );
  }

  private buildSystemPrompt(mode: AiMode): string {
    const ctx = this.cachedContext;
    const base = ctx
      ? `You are MediConnect AI, a patient health assistant. Patient: ${ctx.patientName}, Age: ${ctx.age}, Gender: ${ctx.gender}, Blood Group: ${ctx.bloodGroup}. ` +
        (ctx.prescriptions.length ? `Current medications: ${ctx.prescriptions.join(', ')}. ` : '') +
        (ctx.conditions.length ? `Known conditions: ${ctx.conditions.join(', ')}. ` : '') +
        `Always provide helpful, clear health information while reminding the patient to consult their doctor for personalized advice. Never replace professional medical advice.`
      : `You are MediConnect AI, a patient health assistant. Provide helpful, clear health information and always remind the patient to consult their doctor for personalized advice.`;

    if (mode === 'symptom') return base + ' Focus on symptom assessment, possible causes, and when to seek medical attention urgently.';
    if (mode === 'report') return base + ' Focus on explaining medical test results, lab values, and what they mean in plain language.';
    if (mode === 'booking') return base + ' Focus on helping the patient understand which specialist they need and how urgently they should seek care.';
    return base;
  }
}
