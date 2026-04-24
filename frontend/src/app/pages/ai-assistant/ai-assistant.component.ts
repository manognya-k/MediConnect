import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../services/layout.service';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage, ConversationHistory, SuggestionChip } from '../../models/chat.model';

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

  readonly chips: SuggestionChip[] = [
    { label: 'Summarise today\'s appointments' },
    { label: 'Interpret lipid panel results' },
    { label: 'Hypertension treatment guidelines' },
    { label: 'Drug interaction check' },
    { label: 'Cardiology referral criteria' },
  ];

  constructor(
    public layout: LayoutService,
    private aiService: AiAssistantService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.name ?? 'Doctor';
    this.userInitials = this.deriveInitials(this.userName);

    this.messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Hello ${this.userName}! I'm your MediConnect AI assistant. I can help you with clinical queries, patient summaries, medication information, lab result interpretation, and more.\n\nWhat can I help you with today?`,
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
    const letters = words
      .filter(w => /[A-Z]/.test(w[0]))
      .map(w => w[0]);
    if (letters.length >= 2) return letters.slice(0, 2).join('');
    return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  sendChip(chip: SuggestionChip) {
    this.inputText = chip.label;
    this.chipsVisible = false;
    this.sendMessage();
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

  formatContent(text: string): string {
    return text.replace(/\n/g, '<br>');
  }

  trackByMessageId(_: number, msg: ChatMessage): string {
    return msg.id;
  }
}
