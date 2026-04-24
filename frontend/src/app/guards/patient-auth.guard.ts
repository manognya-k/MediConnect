import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PatientAuthService } from '../patient/services/patient-auth.service';

export const patientAuthGuard: CanActivateFn = () => {
  const auth   = inject(PatientAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
