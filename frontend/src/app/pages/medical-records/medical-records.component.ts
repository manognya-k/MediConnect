import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../services/layout.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { MedicalRecord, PatientSummary, BackendMedicalRecord, RecordStatus } from '../../models/medical-record.model';
import { MedicalRecordFormComponent } from './medical-record-form/medical-record-form.component';
import { AddNoteComponent } from './add-note/add-note.component';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicalRecordFormComponent, AddNoteComponent],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.scss'
})
export class MedicalRecordsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  allPatients: PatientSummary[] = [];
  filteredPatients: PatientSummary[] = [];
  searchQuery = '';

  selectedPatient: PatientSummary | null = null;
  patientRecords: MedicalRecord[] = [];
  latestRecord: MedicalRecord | null = null;

  loading = true;
  error = '';
  detailLoading = false;

  showRecordForm = false;
  showAddNote = false;
  editingRecord: MedicalRecord | null = null;

  doctorId: number | null = null;
  hospitalId: number | null = null;

  private allBackendRecords: BackendMedicalRecord[] = [];

  constructor(
    public layout: LayoutService,
    private svc: MedicalRecordService,
    private toast: ToastService,
    private auth: AuthService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => this.applySearch(q));

    const user = this.auth.getUser();
    if (!user) { this.loadAll(); return; }

    this.dashSvc.getAllDoctors().subscribe({
      next: (docs) => {
        const doc = docs.find(d => d.user?.userId === user.userId);
        if (doc) {
          this.doctorId = doc.doctorId;
          this.hospitalId = doc.hospital?.hospitalId ?? null;
        }
        this.loadAll();
      },
      error: () => this.loadAll()
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll() {
    this.loading = true;
    this.error = '';
    this.svc.getAll().subscribe({
      next: (records) => {
        // Scope to this doctor's records when doctorId is available
        const scoped = this.doctorId
          ? records.filter(r => r.doctor?.doctorId === this.doctorId)
          : records;
        this.allBackendRecords = scoped.length > 0 ? scoped : records;
        this.allPatients = this.svc.buildPatientList(this.allBackendRecords);
        this.filteredPatients = [...this.allPatients];
        this.loading = false;
        if (this.allPatients.length > 0) {
          this.selectPatient(this.allPatients[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load medical records.';
      }
    });
  }

  onSearchInput(val: string) {
    this.searchQuery = val;
    this.searchSubject.next(val);
  }

  private applySearch(q: string) {
    if (!q.trim()) {
      this.filteredPatients = [...this.allPatients];
      return;
    }
    const lower = q.toLowerCase();
    this.filteredPatients = this.allPatients.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.latestDiagnosis.toLowerCase().includes(lower)
    );
  }

  selectPatient(pt: PatientSummary) {
    this.selectedPatient = pt;
    this.detailLoading = true;
    this.patientRecords = [];
    this.latestRecord = null;

    const recs = this.allBackendRecords.filter(r => r.patient?.patientId === pt.patientId);
    const sorted = [...recs].sort((a, b) =>
      new Date(b.recordDate || 0).getTime() - new Date(a.recordDate || 0).getTime()
    );

    this.patientRecords = sorted.map((r, i) => this.svc.mapToUI(r, i));
    this.latestRecord = this.patientRecords[0] ?? null;
    this.detailLoading = false;
  }

  parsePrescription(raw: string): { drug: string; dose: string; freq: string }[] {
    if (!raw || !raw.trim()) return [];
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|').map(s => s.trim());
      return { drug: parts[0] || line, dose: parts[1] || '—', freq: parts[2] || '—' };
    });
  }

  statusClass(status: RecordStatus): string {
    const map: Record<RecordStatus, string> = {
      Active: 'b-blue',
      Treated: 'b-green',
      Ongoing: 'b-amber',
      Critical: 'b-red',
    };
    return map[status] ?? 'b-blue';
  }

  openNewRecord() {
    this.editingRecord = null;
    this.showRecordForm = true;
  }

  openEditRecord() {
    this.editingRecord = this.latestRecord;
    this.showRecordForm = true;
  }

  onRecordSaved() {
    this.showRecordForm = false;
    this.loadAll();
  }

  onRecordCancelled() {
    this.showRecordForm = false;
  }

  openAddNote() {
    this.showAddNote = true;
  }

  onNoteSaved(note: string) {
    if (!this.latestRecord) return;
    const existing = this.latestRecord.notes?.trim() || '';
    const updated = existing ? `${existing}\n${note}` : note;

    const backend = this.allBackendRecords.find(r => r.recordId === this.latestRecord!.recordId);
    if (!backend) return;

    const body = { ...backend, notes: updated };
    this.svc.update(this.latestRecord.recordId, body).subscribe({
      next: () => {
        this.toast.show('Note added successfully.', 'success');
        this.showAddNote = false;
        this.loadAll();
      },
      error: () => {
        this.toast.show('Failed to add note.', 'error');
      }
    });
  }

  onNoteCancelled() {
    this.showAddNote = false;
  }

  trackById(_: number, item: { patientId?: number; recordId?: number }) {
    return item.patientId ?? item.recordId;
  }
}
