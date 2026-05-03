import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AdminPatientsService } from '../../services/admin-patients.service';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-patients.component.html',
  styleUrl: './admin-patients.component.scss'
})
export class AdminPatientsComponent implements OnInit, OnDestroy {
  patients: any[] = [];
  filteredPatients: any[] = [];
  searchTerm = '';
  activeTab: 'inpatients' | 'outpatients' = 'inpatients';
  selectedPatient: any = null;
  isLoading = true;
  today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  private destroy$ = new Subject<void>();

  constructor(private svc: AdminPatientsService) {}

  ngOnInit() {
    timer(0, 30000).pipe(
      switchMap(() => this.svc.getPatients()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = [...patients];
        if (patients.length) this.selectedPatient = patients[0];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'inpatients' | 'outpatients') { this.activeTab = tab; }

  search() {
    const t = this.searchTerm.toLowerCase();
    this.filteredPatients = this.patients.filter(p =>
      p.name?.toLowerCase().includes(t) || p.email?.toLowerCase().includes(t)
    );
  }

  selectPatient(p: any) { this.selectedPatient = p; }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = { 'ACTIVE': 'b-green', 'CRITICAL': 'b-red', 'STABLE': 'b-teal', 'INACTIVE': 'b-sub' };
    return map[status?.toUpperCase()] ?? 'b-sub';
  }

  get totalCount() { return this.patients.length; }
}
