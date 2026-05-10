import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { PatientLabReportsService } from '../../services/patient-lab-reports.service';
import { PatientStateService } from '../../services/patient-state.service';
import { ToastService } from '../../../services/toast.service';
import { PatientLabReport, FlaggedAlert, AiMessage } from '../../models/patient-lab-report.model';

@Component({
  selector: 'app-patient-lab-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './patient-lab-reports.component.html',
  styleUrl: './patient-lab-reports.component.scss'
})
export class PatientLabReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error   = '';

  reports:       PatientLabReport[] = [];
  flaggedAlerts: FlaggedAlert[]     = [];

  // AI panel state
  aiLoading      = false;
  aiSending      = false;
  aiMessageHtml: SafeHtml | null = null;
  aiInputText    = '';
  conversationHistory: AiMessage[] = [];
  suggestChips: string[] = [
    'What is LDL cholesterol?',
    'How to lower LDL naturally?',
    'What are statins?',
    'Is my ECG result good?',
  ];

  // Download state
  downloading: Record<string, boolean> = {};

  constructor(
    private svc:       PatientLabReportsService,
    private state:     PatientStateService,
    private toast:     ToastService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const patient = this.state.getPatient();
    const name    = patient?.name ?? 'Patient';
    this.conversationHistory = [{
      role:    'assistant',
      content: `You are MediConnect AI, helping patient ${name} understand their lab reports. ` +
               `Be clear, reassuring, and patient-friendly. Avoid excessive medical jargon. ` +
               `Always recommend consulting their doctor for any medical decisions.`,
    }];
    this.loadData();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadData() {
    this.loading = true;
    this.error   = '';
    this.svc.getLabReports().pipe(takeUntil(this.destroy$)).subscribe({
      next: reports => {
        this.reports       = reports;
        this.flaggedAlerts = this.svc.buildFlaggedAlertsFrom(reports);
        this.loading       = false;

        // Auto-expand first flagged report
        const first = reports.find(r => r.isFlagged);
        if (first) first.isExpanded = true;

        // Auto-load AI explanation for first flagged report
        if (this.flaggedAlerts.length > 0) {
          this.loadAiExplanation(this.flaggedAlerts[0].reportId);
        }
      },
      error: () => {
        this.loading = false;
        this.error   = 'Failed to load lab reports. Please try again.';
      }
    });
  }

  // ── Accordion ────────────────────────────────────────────────────────────────

  toggleReport(report: PatientLabReport) {
    if (report.status === 'Pending') return;
    const opening = !report.isExpanded;
    this.reports.forEach(r => r.isExpanded = false);
    if (opening) report.isExpanded = true;
  }

  // ── AI explanation ────────────────────────────────────────────────────────────

  loadAiExplanation(reportId: string) {
    this.aiLoading     = true;
    this.aiMessageHtml = null;
    this.svc.explainReport(reportId).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ explanation }) => {
        this.aiLoading     = false;
        this.aiMessageHtml = this.safe(explanation);
        this.conversationHistory.push({ role: 'assistant', content: explanation });

        const report = this.reports.find(r => r.id === reportId);
        if (report) this.updateChips(report.testName);
      },
      error: () => {
        this.aiLoading     = false;
        this.aiMessageHtml = this.safe('<span class="err-text">Could not load explanation. Please try again.</span>');
      }
    });
  }

  explainFromCard(event: MouseEvent, report: PatientLabReport) {
    event.stopPropagation();
    this.loadAiExplanation(report.id);
  }

  updateChips(testName: string) {
    if (testName === 'Lipid Panel') {
      this.suggestChips = ['What is LDL cholesterol?', 'How to lower LDL naturally?', 'What are statins?', 'Is my ECG result good?'];
    } else if (testName === 'ECG Analysis') {
      this.suggestChips = ['What is normal sinus rhythm?', 'What does PR interval mean?', 'When is an ECG abnormal?', 'How often should I do an ECG?'];
    } else {
      this.suggestChips = ['Explain this test', 'What does this result mean?', 'When will results be ready?', 'What if results are abnormal?'];
    }
  }

  // ── AI chat ──────────────────────────────────────────────────────────────────

  sendMessage() {
    const text = this.aiInputText.trim();
    if (!text || this.aiSending) return;
    this.aiInputText = '';
    this.askAi(text);
  }

  onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  askAi(question: string) {
    if (this.aiSending) return;
    this.aiSending  = true;
    this.aiLoading  = true;
    this.conversationHistory.push({ role: 'user', content: question });

    this.svc.sendAiMessage(this.conversationHistory).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ reply }) => {
        this.conversationHistory.push({ role: 'assistant', content: reply });
        this.aiMessageHtml = this.safe(reply);
        this.aiLoading  = false;
        this.aiSending  = false;
      },
      error: () => {
        this.aiMessageHtml = this.safe('<span class="err-text">Could not get a response. Please try again.</span>');
        this.aiLoading  = false;
        this.aiSending  = false;
      }
    });
  }

  // ── Download ─────────────────────────────────────────────────────────────────

  downloadReport(event: MouseEvent, report: PatientLabReport) {
    event.stopPropagation();
    this.downloading[report.id] = true;
    this.svc.downloadReport(report.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.downloading[report.id] = false; },
      error: () => {
        this.downloading[report.id] = false;
        this.toast.show('Could not generate report. Please try again.', 'error');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  safe(text: string): SafeHtml {
    const html = this.markdownToHtml(text);
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  private markdownToHtml(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h4 style="font-size:.9em;font-weight:700;margin:8px 0 3px;color:#0D2B4E">$1</h4>')
      .replace(/^## (.+)$/gm,  '<h3 style="font-size:.95em;font-weight:700;margin:10px 0 4px;color:#0D2B4E">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
        const items = block.trim().split('\n')
          .map(l => `<li style="margin-bottom:3px">${l.replace(/^[-*] /, '').trim()}</li>`)
          .join('');
        return `<ul style="margin:6px 0 6px 16px;padding:0">${items}</ul>`;
      })
      .replace(/\n(?!<(?:ul|h[2-4]))/g, '<br>');
  }

  trackByReport(_: number, r: PatientLabReport): string { return r.id; }
  trackByChip  (_: number, s: string): string           { return s; }
}
