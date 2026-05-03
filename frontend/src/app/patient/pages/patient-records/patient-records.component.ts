import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { PatientRecordsService } from '../../services/patient-records.service';
import { PatientRecordSummary, PatientRecordDetail, RecordType } from '../../models/patient-record.model';

@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './patient-records.component.html',
  styleUrl: './patient-records.component.scss'
})
export class PatientRecordsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  searchCtrl = new FormControl('');

  records: PatientRecordSummary[] = [];
  selectedRecord: PatientRecordDetail | null = null;
  selectedId: string | null = null;

  listLoading  = true;
  detailLoading = false;
  listError    = '';
  detailError  = '';

  constructor(
    private svc: PatientRecordsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Load initial list
    this.loadList('');

    // Debounced search
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => this.loadList(q ?? ''));

    // Pre-select from URL query param ?id=
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      this.selectRecord(idParam);
    }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── List ──────────────────────────────────────────────────────────────────

  private loadList(search: string) {
    this.listLoading = true;
    this.listError   = '';
    this.svc.getRecordList(search).pipe(takeUntil(this.destroy$)).subscribe({
      next:  r => { this.records = r; this.listLoading = false; },
      error: () => { this.listError = 'Failed to load records.'; this.listLoading = false; }
    });
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  selectRecord(id: string) {
    if (this.selectedId === id) return;
    this.selectedId     = id;
    this.detailLoading  = true;
    this.detailError    = '';
    this.selectedRecord = null;

    // Update URL without navigation (shallow)
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id },
      replaceUrl: true
    });

    this.svc.getRecordDetail(id).pipe(takeUntil(this.destroy$)).subscribe({
      next:  d => { this.selectedRecord = d; this.detailLoading = false; },
      error: () => { this.detailError = 'Failed to load record details.'; this.detailLoading = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns display label + css class for a record type */
  typeStyle(type: RecordType): { label: string; cls: string } {
    switch (type) {
      case 'Consultation': return { label: 'Consultation', cls: 'type-blue' };
      case 'Surgery':      return { label: 'Surgery',      cls: 'type-purple' };
      case 'Emergency':    return { label: 'Emergency',    cls: 'type-red' };
      case 'Prescription': return { label: 'Prescription', cls: 'type-green' };
      case 'Checkup':      return { label: 'Checkup',      cls: 'type-teal' };
      case 'Referral':     return { label: 'Referral',     cls: 'type-amber' };
      default:             return { label: type,           cls: 'type-blue' };
    }
  }

  trackByRecord(_: number, r: PatientRecordSummary) { return r.id; }
}
