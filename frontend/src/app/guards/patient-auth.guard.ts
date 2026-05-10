import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { PatientAuthService } from '../patient/services/patient-auth.service';

export const patientAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(PatientAuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  const user    = auth.getStoredUser();
  const routeId = Number(route.paramMap.get('id'));
  if (Number.isFinite(routeId) && routeId !== user?.userId) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
