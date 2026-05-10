import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked, SecurityContext
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PatientAiService } from '../../services/patient-ai.service';
import { PatientAuthService } from '../../services/patient-auth.service';
import {
  AiMode, AiMessage, ConversationTurn,
  PatientAiContext, ModeOption, ContextItem
} from '../../models/patient-ai.model';

const MODE_OPTIONS: ModeOption[] = [
  { id: 'general',  label: 'General Chat',       subLabel: 'Ask anything'             },
  { id: 'symptom',  label: 'Symptom Checker',    subLabel: 'Describe symptoms'         },
  { id: 'report',   label: 'Report Explanation', subLabel: 'Understand your results'   },
  { id: 'booking',  label: 'Book Appointment',   subLabel: 'AI-assisted booking'       },
];

const CHIPS_BY_MODE: Record<string, string[]> = {
  general: [
    'Explain my lipid panel results',
    'What does elevated LDL mean?',
    'How to lower blood pressure naturally',
    'Side effects of Amlodipine',
    'When should I see a doctor urgently?',
  ],
  symptom: [
    'I have chest tightness',
    'I feel dizzy when I stand up',
    'I have a persistent headache',
    'My legs are swelling',
    'I have shortness of breath',
  ],
  report: [
    'Explain my Lipid Panel results',
    'What does LDL 185 mg/dL mean?',
    'Is my HbA1c result normal?',
    'What do my ECG results mean?',
    'Explain my triglycerides reading',
  ],
  booking: [
    'I need a cardiology appointment',
    'Who should I see for diabetes?',
    'How urgent is my condition?',
    'What specialist do I need?',
    'When is my next follow-up due?',
  ],
};

const QUICK_QUESTIONS = [
  'What does my blood pressure reading mean?',
  'How can I manage my diabetes better?',
  'What foods should I avoid with high cholesterol?',
  'When should I see a doctor urgently?',
  'Explain my Amlodipine prescription',
  'How to reduce LDL cholesterol with diet?',
  'What are the symptoms of high blood pressure?',
  'Is it safe to exercise with hypertension?',
];

@Component({
  selector: 'app-patient-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './patient-ai.component.html',
  styleUrl: './patient-ai.component.scss'
})
export class PatientAiComponent implements OnInit, OnDestroy, AfterViewChecked {
  private destroy$       = new Subject<void>();
  private shouldScroll   = false;

  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;
  @ViewChild('textareaEl') textareaEl!: ElementRef<HTMLTextAreaElement>;

  // Data
  patientContext: PatientAiContext | null = null;
  contextItems:   ContextItem[]          = [];
  messages:       AiMessage[]            = [];
  conversationHistory: ConversationTurn[] = [];

  // UI state
  activeMode:    AiMode   = 'general';
  modeOptions             = MODE_OPTIONS;
  quickQuestions          = QUICK_QUESTIONS;

  get currentChips(): string[] {
    return CHIPS_BY_MODE[this.activeMode] ?? CHIPS_BY_MODE['general'];
  }
  chipsVisible            = true;
  isLoading               = false;
  isTyping                = false;
  inputText               = '';
  contextLoading          = true;

  // Expose to template
  safeWelcomeHtml: SafeHtml | null = null;

  constructor(
    private aiSvc:     PatientAiService,
    private patientAuth: PatientAuthService,
    private route:     ActivatedRoute,
    public  router:    Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.aiSvc.getPatientContext().pipe(takeUntil(this.destroy$)).subscribe(ctx => {
      this.patientContext  = ctx;
      this.contextLoading  = false;
      this.buildContextItems(ctx);
      this.buildWelcomeMessage(ctx);

      // Handle ?q= query param after context loads
      const q = this.route.snapshot.queryParamMap.get('q');
      if (q) {
        setTimeout(() => {
          this.inputText = decodeURIComponent(q);
          this.sendMessage();
        }, 800);
      }
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Context card ──────────────────────────────────────────────────────────

  private buildContextItems(ctx: PatientAiContext): void {
    this.contextItems = [
      ...ctx.conditions.map(c => ({ dot: '#2272C3', text: `${c} (Ongoing)` })),
      ...ctx.labFlags.map(f   => ({ dot: '#B45309', text: f })),
      { dot: '#0F7B50', text: `${ctx.prescriptions.length} active prescriptions` },
      { dot: '#0F7B50', text: `Next appt: ${ctx.nextAppointment}` }
    ];
  }

  // ── Welcome message ───────────────────────────────────────────────────────

  private buildWelcomeMessage(ctx: PatientAiContext): void {
    const firstName  = ctx.patientName.split(' ')[0];
    const labFlagHtml = ctx.labFlags.length > 0
      ? `<br><br>I can see your latest lab results show <span class="warn">${ctx.labFlags[0]}</span>. Would you like me to explain what this means?`
      : '';

    const html = `Hello <strong>${firstName}</strong>! I'm your MediConnect AI assistant. I have access to your health context and can help you with:<br><br>
🔍 <strong>Symptom Checker</strong> — describe symptoms for initial guidance<br>
🧪 <strong>Report Explanation</strong> — understand your lab results in plain language<br>
📅 <strong>Appointment Booking</strong> — I can help you find the right doctor and time${labFlagHtml}`;

    const welcomeMsg: AiMessage = {
      id:        'welcome',
      role:      'assistant',
      content:   html,
      timestamp: new Date()
    };
    this.messages.push(welcomeMsg);
    this.safeWelcomeHtml = this.sanitizer.sanitize(SecurityContext.HTML,html);
    this.shouldScroll = true;
  }

  // ── Mode switching ────────────────────────────────────────────────────────

  setMode(mode: AiMode): void { this.activeMode = mode; }

  // ── Chip click ────────────────────────────────────────────────────────────

  onChipClick(chip: string): void {
    this.inputText   = chip;
    this.chipsVisible = false;
    this.sendMessage();
  }

  // ── Quick question fill ───────────────────────────────────────────────────

  fillInput(text: string): void {
    this.inputText = text;
    setTimeout(() => this.textareaEl?.nativeElement.focus(), 0);
  }

  // ── Tool card actions ─────────────────────────────────────────────────────

  activateTool(mode: AiMode, prefill: string): void {
    this.activeMode = mode;
    this.inputText  = prefill;
    setTimeout(() => this.textareaEl?.nativeElement.focus(), 0);
  }

  // ── Send message ──────────────────────────────────────────────────────────

  sendMessage(): void {
    if (this.isLoading) return;
    const text = this.inputText.trim();
    if (!text) return;

    this.inputText    = '';
    this.chipsVisible = false;
    this.resetTextareaHeight();

    const userMsg: AiMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   text,
      timestamp: new Date()
    };
    this.messages.push(userMsg);
    this.conversationHistory.push({ role: 'user', content: text });
    this.shouldScroll = true;

    this.isLoading = true;
    this.isTyping  = true;

    this.aiSvc.sendMessage(this.conversationHistory, this.activeMode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: reply => {
          this.isTyping = false;
          const aiMsg: AiMessage = {
            id:        crypto.randomUUID(),
            role:      'assistant',
            content:   reply,
            timestamp: new Date()
          };
          this.messages.push(aiMsg);
          this.conversationHistory.push({ role: 'assistant', content: reply });
          this.isLoading    = false;
          this.shouldScroll = true;
        },
        error: () => {
          this.isTyping = false;
          this.messages.push({
            id:        crypto.randomUUID(),
            role:      'assistant',
            isError:   true,
            content:   'Connection error. Please check your network and try again.',
            timestamp: new Date()
          });
          this.isLoading    = false;
          this.shouldScroll = true;
        }
      });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Auto-resize textarea ──────────────────────────────────────────────────

  autoResize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  private resetTextareaHeight(): void {
    if (this.textareaEl) {
      this.textareaEl.nativeElement.style.height = 'auto';
    }
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  private scrollToBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ── Sanitize AI message HTML ──────────────────────────────────────────────

  safeHtml(content: string): SafeHtml {
    const html = this.markdownToHtml(content);
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  private markdownToHtml(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
      .replace(/^## (.+)$/gm,  '<h3 class="md-h3">$1</h3>')
      .replace(/^# (.+)$/gm,   '<h2 class="md-h2">$1</h2>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,         '<em>$1</em>')
      .replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
        const items = block.trim().split('\n')
          .map(l => `<li>${l.replace(/^[-*] /, '').trim()}</li>`)
          .join('');
        return `<ul class="md-ul">${items}</ul>`;
      })
      .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
        const items = block.trim().split('\n')
          .map(l => `<li>${l.replace(/^\d+\. /, '').trim()}</li>`)
          .join('');
        return `<ol class="md-ol">${items}</ol>`;
      })
      .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
      .replace(/^---$/gm, '<hr class="md-hr">')
      .replace(/\n(?!<(?:ul|ol|h[2-4]|hr|li))/g, '<br>');
  }

  goToAppointments(): void {
    const userId = this.patientAuth.getStoredUser()?.userId;
    if (userId) {
      this.router.navigate(['/patient', userId, 'appointments']);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get firstName(): string {
    return this.patientContext?.patientName.split(' ')[0] ?? 'there';
  }

  get patientInitials(): string {
    if (!this.patientContext) return 'P';
    return this.patientContext.patientName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  trackById(_: number, m: AiMessage) { return m.id; }
  trackByCtx(_: number, c: ContextItem) { return c.text; }
}
