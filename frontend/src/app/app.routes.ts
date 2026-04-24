import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
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
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
