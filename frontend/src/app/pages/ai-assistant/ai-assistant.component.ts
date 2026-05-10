import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, SecurityContext
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../services/layout.service';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage, ConversationHistory } from '../../models/chat.model';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.scss'
})
export class AiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private shouldScroll = false;

  messages: ChatMessage[] = [];
  conversationHistory: ConversationHistory[] = [];
  inputText = '';
  isLoading = false;
  isTyping = false;
  chipsVisible = true;

  userName = '';
  userInitials = '';

  readonly chips: string[] = [
    "Summarise today's appointments",
    'Interpret elevated LDL cholesterol results',
    'Hypertension Stage 2 treatment guidelines',
    'Drug interaction: Amlodipine + Metformin',
    'Cardiology referral criteria',
    'ICD-10 code for Type 2 Diabetes with CKD',
    'Post-surgery follow-up protocol',
    'Troponin I elevation — differential diagnosis',
  ];

  readonly quickQuestions: string[] = [
    'What is the normal range for HbA1c?',
    'Guidelines for starting statin therapy',
    'When to refer a patient to ICU?',
    'Recommended BP targets for diabetic patients',
    'How to interpret a BNP result?',
    'Common side effects of Lisinopril',
    'ECG interpretation: left bundle branch block',
    'Dosing of Metformin in CKD patients',
  ];

  constructor(
    public layout: LayoutService,
    private aiService: AiAssistantService,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.name ?? 'Doctor';
    this.userInitials = this.deriveInitials(this.userName);

    const lastName = this.userName.split(' ').pop() || this.userName;

    const welcomeHtml =
      `Hello <strong>Dr. ${lastName}</strong>! I'm your MediConnect clinical AI assistant.<br><br>` +
      `I can help you with:<br><br>` +
      `🔬 <strong>Clinical Queries</strong> — guidelines, protocols, and evidence-based recommendations<br>` +
      `🧪 <strong>Lab Interpretation</strong> — explain results in clinical context<br>` +
      `💊 <strong>Medication Support</strong> — dosing, interactions, contraindications<br>` +
      `📋 <strong>ICD-10 Coding</strong> — find the right diagnostic codes<br><br>` +
      `What can I help you with today?`;

    this.messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: welcomeHtml,
      timestamp: new Date(),
    });
    this.shouldScroll = true;
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private deriveInitials(name: string): string {
    const words = name.split(/\s+/).filter(w => w.length > 0);
    const letters = words.filter(w => /[A-Z]/.test(w[0])).map(w => w[0]);
    if (letters.length >= 2) return letters.slice(0, 2).join('');
    return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  onChipClick(chip: string): void {
    this.inputText = chip;
    this.chipsVisible = false;
    this.sendMessage();
  }

  onQuickQuestionClick(question: string): void {
    this.inputText = question;
    setTimeout(() => {
      const ta = document.querySelector<HTMLElement>('textarea.chat-input');
      ta?.focus();
    }, 0);
  }

  sendMessage() {
    if (this.isLoading) return;
    const text = this.inputText.trim();
    if (!text) return;

    this.inputText = '';
    this.chipsVisible = false;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.conversationHistory.push({ role: 'user', content: text });
    this.shouldScroll = true;

    this.isLoading = true;
    this.isTyping = true;

    this.aiService.sendMessage(this.conversationHistory)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reply) => {
          this.isTyping = false;
          this.isLoading = false;
          this.messages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          });
          this.conversationHistory.push({ role: 'assistant', content: reply });
          this.shouldScroll = true;
        },
        error: () => {
          this.isTyping = false;
          this.isLoading = false;
          this.messages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            isError: true,
            content: 'Connection error. Please check your network and try again.',
            timestamp: new Date(),
          });
          this.shouldScroll = true;
        },
      });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  safeHtml(content: string): SafeHtml {
    const html = this.markdownToHtml(content);
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  private markdownToHtml(md: string): string {
    return md
      // Headers (### ## #)
      .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
      .replace(/^## (.+)$/gm,  '<h3 class="md-h3">$1</h3>')
      .replace(/^# (.+)$/gm,   '<h2 class="md-h2">$1</h2>')
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,         '<em>$1</em>')
      // Bullet lists: group consecutive lines starting with - or *
      .replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
        const items = block.trim().split('\n')
          .map(l => `<li>${l.replace(/^[-*] /, '').trim()}</li>`)
          .join('');
        return `<ul class="md-ul">${items}</ul>`;
      })
      // Numbered lists
      .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
        const items = block.trim().split('\n')
          .map(l => `<li>${l.replace(/^\d+\. /, '').trim()}</li>`)
          .join('');
        return `<ol class="md-ol">${items}</ol>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="md-hr">')
      // Remaining newlines → <br> (skip lines that are block elements)
      .replace(/\n(?!<(?:ul|ol|h[2-4]|hr|li))/g, '<br>');
  }

  trackByMessageId(_: number, msg: ChatMessage): string {
    return msg.id;
  }
}
