import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { patientAuthGuard } from './guards/patient-auth.guard';
import { adminAuthGuard } from './guards/admin-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // ── Doctor portal ──
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'doctor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/doctor-layout/doctor-layout.component').then(
        (m) => m.DoctorLayoutComponent
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/doctor-dashboard/doctor-dashboard.component').then(
            (m) => m.DoctorDashboardComponent
          )
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./pages/patients/patients.component').then(
            (m) => m.PatientsComponent
          )
      },
      {
        path: 'patients/:id',
        loadComponent: () =>
          import('./pages/patient-detail/patient-detail.component').then(
            (m) => m.PatientDetailComponent
          )
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./pages/appointments/appointments.component').then(
            (m) => m.AppointmentsComponent
          )
      },
      {
        path: 'lab-reports',
        loadComponent: () =>
          import('./pages/lab-reports/lab-reports.component').then(
            (m) => m.LabReportsComponent
          )
      },
      {
        path: 'medical-records',
        loadComponent: () =>
          import('./pages/medical-records/medical-records.component').then(
            (m) => m.MedicalRecordsComponent
          )
      },
      {
        path: 'telemedicine',
        loadComponent: () =>
          import('./pages/telemedicine/telemedicine.component').then(
            (m) => m.TelemedicineComponent
          )
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then(
            (m) => m.AnalyticsComponent
          )
      },
      {
        path: 'supply-chain',
        loadComponent: () =>
          import('./pages/supply-chain/supply-chain.component').then(
            (m) => m.SupplyChainComponent
          )
      },
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('./pages/ai-assistant/ai-assistant.component').then(
            (m) => m.AiAssistantComponent
          )
      }
    ]
  },

  // ── Patient portal ──
  {
    path: 'patient',
    canActivate: [patientAuthGuard],
    loadComponent: () =>
      import('./layouts/patient-layout/patient-layout.component').then(
        (m) => m.PatientLayoutComponent
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { title: 'Health Overview' },
        loadComponent: () =>
          import('./patient/pages/patient-dashboard/patient-dashboard.component').then(
            (m) => m.PatientDashboardComponent
          )
      },
      {
        path: 'appointments',
        data: { title: 'Appointments', subtitle: 'Manage & book consultations' },
        loadComponent: () =>
          import('./patient/pages/patient-appointments/patient-appointments.component').then(
            (m) => m.PatientAppointmentsComponent
          )
      },
      {
        path: 'records',
        data: { title: 'Medical Records', subtitle: 'Your health history' },
        loadComponent: () =>
          import('./patient/pages/patient-records/patient-records.component').then(
            (m) => m.PatientRecordsComponent
          )
      },
      {
        path: 'lab-reports',
        data: { title: 'Lab Reports', subtitle: 'Test results with AI-powered explanations' },
        loadComponent: () =>
          import('./patient/pages/patient-lab-reports/patient-lab-reports.component').then(
            (m) => m.PatientLabReportsComponent
          )
      },
      {
        path: 'telemedicine',
        data: { title: 'Telemedicine', subtitle: 'Connect with your doctor remotely' },
        loadComponent: () =>
          import('./patient/pages/patient-telemedicine/patient-telemedicine.component').then(
            (m) => m.PatientTelemedicineComponent
          )
      },
      {
        path: 'reminders',
        data: { title: 'Medicine Reminders', subtitle: 'Track your daily medications' },
        loadComponent: () =>
          import('./patient/pages/patient-reminders/patient-reminders.component').then(
            (m) => m.PatientRemindersComponent
          )
      },
      {
        path: 'ai',
        data: { title: 'AI Health Assistant', subtitle: 'Your personal health guide' },
        loadComponent: () =>
          import('./patient/pages/patient-ai/patient-ai.component').then(
            (m) => m.PatientAiComponent
          )
      },
      {
        path: 'notifications',
        data: { title: 'Notifications' },
        loadComponent: () =>
          import('./patient/pages/patient-placeholder/patient-placeholder.component').then(
            (m) => m.PatientPlaceholderComponent
          )
      }
    ]
  },

  // ── Admin portal ──
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/pages/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      )
  },
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./admin/layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./admin/pages/admin-overview/admin-overview.component').then(
            (m) => m.AdminOverviewComponent
          )
      },
      {
        path: 'hospitals',
        loadComponent: () =>
          import('./admin/pages/admin-hospitals/admin-hospitals.component').then(
            (m) => m.AdminHospitalsComponent
          )
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./admin/pages/admin-patients/admin-patients.component').then(
            (m) => m.AdminPatientsComponent
          )
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./admin/pages/admin-appointments/admin-appointments.component').then(
            (m) => m.AdminAppointmentsComponent
          )
      },
      {
        path: 'diagnostics',
        loadComponent: () =>
          import('./admin/pages/admin-diagnostics/admin-diagnostics.component').then(
            (m) => m.AdminDiagnosticsComponent
          )
      },
      {
        path: 'supply',
        loadComponent: () =>
          import('./admin/pages/admin-supply/admin-supply.component').then(
            (m) => m.AdminSupplyComponent
          )
      },
      {
        path: 'revenue',
        loadComponent: () =>
          import('./admin/pages/admin-revenue/admin-revenue.component').then(
            (m) => m.AdminRevenueComponent
          )
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./admin/pages/admin-analytics/admin-analytics.component').then(
            (m) => m.AdminAnalyticsComponent
          )
      },
    ]
  },

  { path: '**', redirectTo: '/login' }
];
