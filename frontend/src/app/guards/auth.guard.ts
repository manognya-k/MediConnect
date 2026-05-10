import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const user = auth.getUser();
  if (!user || user.role !== 'DOCTOR') return router.parseUrl('/login');

  const routeId = Number(route.paramMap.get('id'));
  if (Number.isFinite(routeId) && routeId !== user.userId) {
    return router.parseUrl('/forbidden');
  }
  return true;
};
