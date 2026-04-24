import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AiChatRequest, AiChatResponse, ConversationHistory } from '../models/chat.model';
import { AuthService } from './auth.service';

const BASE = 'http://localhost:8081/api';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  buildSystemPrompt(): string {
    const user = this.auth.getUser();
    const name = user?.name ?? 'Doctor';
    const role = user?.role ?? 'Medical Professional';
    return `You are MediConnect AI, a clinical assistant for ${name}, a ${role} at Central Hospital. You help with:
- Clinical queries and cardiology guidelines
- Patient summary interpretation
- Lab result analysis (lipid panels, ECG, troponin, HbA1c etc.)
- Medication information and drug interactions
- Appointment scheduling advice
- ICD-10 coding assistance

Be concise, professional, and clinically accurate. Use medical terminology appropriately. Always remind the doctor to apply their own clinical judgment.`;
  }

  sendMessage(messages: ConversationHistory[]): Observable<string> {
    const request: AiChatRequest = {
      messages,
      systemPrompt: this.buildSystemPrompt(),
    };
    return this.http.post<AiChatResponse>(`${BASE}/ai/chat`, request).pipe(
      map(res => res.reply || 'No response received.'),
      catchError(() => {
        console.warn(
          '[MediConnect AI] Backend proxy call failed. ' +
          'Ensure POST /api/ai/chat is running in Spring Boot and ' +
          'anthropic.api.key is set in application.properties.'
        );
        return of('Connection error. Please check your network and try again.');
      })
    );
  }
}
