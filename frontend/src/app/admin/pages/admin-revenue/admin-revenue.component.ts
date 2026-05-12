import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ensureChartRegistered } from '../../../shared/chart-setup';

import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil, take } from 'rxjs/operators';
import { AdminRevenueService } from '../../services/admin-revenue.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ToastService } from '../../../services/toast.service';

ensureChartRegistered();


@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './admin-revenue.component.html',
  styleUrl: './admin-revenue.component.scss'
})
export class AdminRevenueComponent implements OnInit, OnDestroy {
  loading = true;
  stats: any = {};
  private destroy$ = new Subject<void>();
  private allAppointments: any[] = [];

  lineData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Appointments',
      data: [],
      borderColor: '#0AAFB8',
      backgroundColor: 'rgba(10,175,184,0.15)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      borderWidth: 2
    }]
  };

  lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 } } }
    },
    scales: {
      x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  doughnutData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#0AAFB8', '#3B82F6', '#EF4444', '#F59E0B'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94A3B8', font: { size: 11 }, padding: 16, usePointStyle: true }
      }
    },
    cutout: '65%'
  };

  bills: any[] = [];
  updatingIds = new Set<number>();

  aiInsights: { dot: string; html: string }[] = [];

  get isAdmin(): boolean {
    return this.adminAuth.isLoggedIn();
  }

  constructor(
    private service: AdminRevenueService,
    private adminAuth: AdminAuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // On first load: run the overdue check + send patient notifications
    this.service.processOverdueBills().pipe(take(1), takeUntil(this.destroy$)).subscribe({
      next: ({ overdueCount }) => {
        if (overdueCount > 0) {
          this.toast.show(`${overdueCount} bill${overdueCount > 1 ? 's' : ''} automatically marked Overdue.`, 'info');
        }
      }
    });

    // Polling loop for stats + full refresh every 30 s
    timer(0, 30000).pipe(
      switchMap(() => this.service.getAllData()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ stats, appointments, bills }) => {
        this.stats = stats;
        this.allAppointments = appointments;
        this.loading = false;
        // Skip rebuilding the bill list while a status update is in flight
        // so we don't overwrite an optimistic change with stale backend data.
        if (this.updatingIds.size === 0) {
          this.applyBillData(bills.length > 0 ? bills : appointments);
        }
        this.buildDoughnut(stats);
        this.buildLineChart(appointments);
        this.buildInsights(stats, appointments);
      },
      error: () => { this.loading = false; }
    });
  }

  private applyBillData(items: any[]): void {
    this.buildBills(items);
    this.showPendingToasts(items);
  }

  private showPendingToasts(items: any[]): void {
    const isBill = (x: any) => x.billDate !== undefined;
    if (!isBill(items[0] ?? {})) return;

    const pending = items.filter(b => b.status === 'PENDING');
    if (pending.length === 0) return;

    pending.forEach(b => {
      const billD = b.billDate ? new Date(b.billDate) : null;
      const dueD  = b.dueDate  ? new Date(b.dueDate)
                  : billD ? new Date(billD.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
      const due = dueD ? dueD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
      const amount = `₹${Number(b.amount ?? 0).toLocaleString('en-IN')}`;
      this.toast.show(
        `Bill #${b.id} pending — ${amount} due on ${due}`,
        'info'
      );
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseDate(raw: any): Date | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return new Date(raw[0], raw[1] - 1, raw[2]);
    return new Date(raw);
  }

  private buildBills(items: any[]) {
    const isBill = (x: any) => x.billDate !== undefined;

    if (isBill(items[0] ?? {})) {
      this.bills = items.slice(0, 6).map(b => {
        const date = b.billDate ? new Date(b.billDate) : null;
        const dateStr = date ? date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—';
        const dueDateRaw = b.dueDate ? new Date(b.dueDate)
                         : date ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
        const dueDateStr = dueDateRaw ? dueDateRaw.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—';
        const amountNum = Number(b.amount ?? 0);
        const status = b.status === 'PAID'    ? 'paid'
                     : b.status === 'WAIVED'  ? 'paid'
                     : b.status === 'OVERDUE' ? 'overdue'
                     : b.status === 'PENDING' ? 'pending' : 'overdue';
        return {
          id: `BILL-${b.id}`,
          rawId: b.id as number,
          patient: b.patientName ?? '—',
          department: b.department ?? 'General',
          amount: `₹${amountNum.toLocaleString('en-IN')}`,
          date: dateStr,
          dueDate: dueDateStr,
          status,
          _savedStatus: status,
          rawAmount: amountNum,
          rawDueDate: b.dueDate ?? null
        };
      });
    } else {
      const sorted = [...items]
        .filter(a => a.appointmentDate)
        .sort((a, b) => {
          const da = this.parseDate(a.appointmentDate)?.getTime() ?? 0;
          const db = this.parseDate(b.appointmentDate)?.getTime() ?? 0;
          return db - da;
        })
        .slice(0, 6);

      this.bills = sorted.map(a => {
        const date = this.parseDate(a.appointmentDate);
        const dateStr = date ? date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—';
        const dept = a.doctor?.specialization || a.doctor?.user?.specialization || 'General';
        const patient = a.patient?.user?.name || '—';
        const status = a.status === 'CONFIRMED' ? 'paid'
                     : a.status === 'PENDING'   ? 'pending'
                     : a.status === 'CANCELLED' ? 'overdue' : 'pending';
        return {
          id: `APT-${a.appointmentId}`,
          patient,
          department: dept,
          amount: '—',
          date: dateStr,
          status
        };
      });
    }
  }

  private buildDoughnut(stats: any) {
    const confirmed = stats.confirmed || 0;
    const pending   = stats.pending   || 0;
    const cancelled = stats.cancelled || 0;
    const video     = stats.video     || 0;
    const inPerson  = Math.max(0, confirmed - video);

    const entries = [
      ['In-Person', inPerson],
      ['Video', video],
      ['Pending', pending],
      ['Cancelled', cancelled]
    ].filter(([, v]) => (v as number) > 0) as [string, number][];

    if (!entries.length) return;

    const colors = ['#0AAFB8', '#3B82F6', '#F59E0B', '#EF4444'];
    this.doughnutData = {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v as number),
        backgroundColor: colors.slice(0, entries.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }

  private buildLineChart(appointments: any[]) {
    const monthCounts: Record<string, number> = {};
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    for (const a of appointments) {
      const d = this.parseDate(a.appointmentDate);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }

    const sorted = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
    if (!sorted.length) return;

    this.lineData = {
      labels: sorted.map(([k]) => {
        const [year, month] = k.split('-');
        return `${monthLabels[+month - 1]} ${year}`;
      }),
      datasets: [{
        label: 'Appointments',
        data: sorted.map(([, v]) => v),
        borderColor: '#0AAFB8',
        backgroundColor: 'rgba(10,175,184,0.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        borderWidth: 2
      }]
    };
  }

  private buildInsights(stats: any, appointments: any[]) {
    const insights: { dot: string; html: string }[] = [];
    const total: number     = stats.total     || 0;
    const confirmed: number = stats.confirmed || 0;
    const pending: number   = stats.pending   || 0;
    const video: number     = stats.video     || 0;

    if (total > 0) {
      const rate = Math.round((confirmed / total) * 100);
      insights.push({ dot: '#10B981', html: `<strong>${confirmed}</strong> of <strong>${total}</strong> appointments confirmed — <strong>${rate}%</strong> conversion rate.` });
    }
    if (pending > 0) {
      insights.push({ dot: '#F59E0B', html: `<strong>${pending} appointment${pending > 1 ? 's' : ''} pending</strong> confirmation. Review and approve to reduce patient wait times.` });
    }
    if (video > 0) {
      insights.push({ dot: '#0AAFB8', html: `<strong>${video}</strong> video consultations booked — ${total > 0 ? Math.round((video / total) * 100) : 0}% of total appointments are telemedicine.` });
    }
    if (!insights.length) {
      insights.push({ dot: '#94A3B8', html: 'No appointment data available yet. Insights will appear once appointments are created.' });
    }
    this.aiInsights = insights.slice(0, 3);
  }

  getBillBadge(status: string): string {
    if (status === 'paid')    return 'b-green';
    if (status === 'pending') return 'b-amber';
    if (status === 'overdue') return 'b-red';
    return 'b-blue';
  }

  onStatusChange(bill: any, newStatus: string): void {
    // [(ngModel)] has already written newStatus into bill.status by the time this fires.
    // Use _savedStatus (last confirmed value) for rollback if the API fails.
    const prevStatus: string = bill._savedStatus;
    if (newStatus === prevStatus) return;

    this.updatingIds.add(bill.rawId);

    this.service.updateBillStatus(bill.rawId, newStatus.toUpperCase())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          bill._savedStatus = newStatus; // commit
          this.updatingIds.delete(bill.rawId);
          this.toast.show('Bill status updated successfully.', 'success');
        },
        error: () => {
          bill.status = prevStatus; // revert view back to last confirmed value
          this.updatingIds.delete(bill.rawId);
          this.toast.show('Failed to update bill status. Please try again.', 'error');
        }
      });
  }

  trackByIndex(index: number): number { return index; }

  downloadReport() {
    const rows = this.bills.map(b => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${b.id}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${b.patient}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${b.department}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${b.amount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${b.date}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-transform:capitalize">${b.status}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0AAFB8; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 700; color: #185FA5; }
  .logo span { color: #1D9E75; }
  h2 { font-size: 16px; color: #0D2B4E; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #F2F4F8; padding: 10px 12px; text-align: left; font-size: 12px; color: #0D2B4E; }
  td { font-size: 13px; }
  .footer { border-top: 1px solid #E5E7EB; margin-top: 40px; padding-top: 12px; font-size: 11px; color: #8A94A6; display: flex; justify-content: space-between; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header"><div class="logo">Medi<span>Connect</span></div><div style="font-size:12px;color:#8A94A6">Appointment Report</div></div>
<h2>Appointment Records</h2>
<table><thead><tr><th>ID</th><th>Patient</th><th>Department</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer"><span>Generated by MediConnect HMS</span><span>${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span></div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    this.toast.show('Report opened for printing/saving as PDF.', 'success');
  }

  exportRevenue() {
    const csv = ['Appointment ID,Patient,Department,Amount,Date,Status']
      .concat(this.bills.map(b => `"${b.id}","${b.patient}","${b.department}","${b.amount}","${b.date}","${b.status}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `appointments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.show('Exported as CSV.', 'success');
  }
}
