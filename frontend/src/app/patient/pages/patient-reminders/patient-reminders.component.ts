import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { forkJoin, takeUntil } from 'rxjs';

import { PatientRemindersService } from '../../services/patient-reminders.service';
import { MedicineStats, TimeSlot, DoseItem, ActivePrescription } from '../../models/patient-reminder.model';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-patient-reminders',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './patient-reminders.component.html',
  styleUrl: './patient-reminders.component.scss'
})
export class PatientRemindersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  today   = new Date();

  stats:         MedicineStats | null = null;
  timeSlots:     TimeSlot[]           = [];
  prescriptions: ActivePrescription[] = [];

  // Skeleton placeholders
  readonly statSkels  = [1, 2, 3, 4];
  readonly slotSkels  = [1, 2, 3];
  readonly rxSkels    = [1, 2, 3, 4];

  constructor(
    private svc:   PatientRemindersService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    forkJoin({
      stats:     this.svc.getStats(),
      schedule:  this.svc.getTodaySchedule(),
      medicines: this.svc.getAllPrescriptions()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ stats, schedule, medicines }) => {
        this.stats         = stats;
        this.timeSlots     = schedule;
        this.prescriptions = medicines;
        this.loading       = false;
      },
      error: () => {
        this.toast.show('Failed to load reminders. Please refresh.', 'error');
        this.loading = false;
      }
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── Toggle dose taken / untaken ──────────────────────────────────────────

  toggleDose(slot: TimeSlot, dose: DoseItem): void {
    if (dose.status === 'done') {
      // Undo — optimistically revert
      dose.status  = 'upcoming';
      dose.isTaken = false;

      this.svc.markUntaken(dose.doseId).subscribe({
        error: () => {
          dose.status  = 'done';
          dose.isTaken = true;
          this.toast.show('Could not update. Please try again.', 'error');
          this.recalculateStats();
          this.recalculateSlotStatus(slot);
        }
      });
    } else {
      // Mark taken — optimistically set done
      dose.status  = 'done';
      dose.isTaken = true;

      this.svc.markTaken(dose.doseId).subscribe({
        error: () => {
          dose.status  = 'upcoming';
          dose.isTaken = false;
          this.toast.show('Could not update. Please try again.', 'error');
          this.recalculateStats();
          this.recalculateSlotStatus(slot);
        }
      });
    }

    this.recalculateSlotStatus(slot);
    this.recalculateStats();
  }

  private recalculateSlotStatus(slot: TimeSlot): void {
    const allDone = slot.doses.every(d => d.isTaken);
    const anyNext = slot.doses.some(d => d.status === 'next');
    slot.status = allDone ? 'done' : anyNext ? 'next' : 'upcoming';
  }

  private recalculateStats(): void {
    if (!this.stats) return;
    const allDoses = this.timeSlots.flatMap(s => s.doses);
    const taken = allDoses.filter(d => d.isTaken).length;
    const total = allDoses.length;
    this.stats = {
      ...this.stats,
      takenToday: taken,
      dueToday:   Math.max(0, total - taken),
      adherencePercent: total > 0 ? Math.round((taken / total) * 100) : 0
    };
  }

  // ── Prescription badge helper ────────────────────────────────────────────

  rxStatusClass(status: ActivePrescription['status']): string {
    switch (status) {
      case 'Active':       return 'b-green';
      case 'Paused':       return 'b-amber';
      case 'Discontinued': return 'b-sub';
      default:             return 'b-sub';
    }
  }

  // ── Adherence label ──────────────────────────────────────────────────────

  adherenceLabel(pct: number): string {
    if (pct >= 80) return 'Good';
    if (pct >= 60) return 'Fair';
    return 'Poor';
  }

  // ── Track fns ────────────────────────────────────────────────────────────

  trackBySlot(_: number, s: TimeSlot)           { return s.time; }
  trackByDose(_: number, d: DoseItem)           { return d.doseId; }
  trackByRx  (_: number, r: ActivePrescription) { return r.id; }
}
