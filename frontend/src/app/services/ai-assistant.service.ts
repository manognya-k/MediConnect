import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConversationHistory } from '../models/chat.model';
import { environment } from '../../environments/environment';

const DOCTOR_SYSTEM_PROMPT =
  'You are MediConnect AI, a clinical workflow assistant for doctors. ' +
  'You help with clinical queries, medical guidelines, lab result analysis, ' +
  'medication information, drug interactions, ICD-10 coding, and appointment advice. ' +
  'Be concise, professional, and clinically accurate. Always remind the doctor to apply their own clinical judgment.';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(private http: HttpClient) {}

  sendMessage(messages: ConversationHistory[]): Observable<string> {
    return this.http.post<{ reply: string }>(`${environment.apiBase}/ai/chat`, {
      messages,
      systemPrompt: DOCTOR_SYSTEM_PROMPT
    }).pipe(
      map(res => res.reply ?? 'AI assistant temporarily unavailable.'),
      catchError(() => throwError(() => new Error('AI assistant temporarily unavailable.')))
    );
  }
}
