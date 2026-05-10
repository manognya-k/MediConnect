import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../admin/services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const adminAuth = inject(AdminAuthService);
  const router    = inject(Router);

  if (!adminAuth.isLoggedIn()) return router.parseUrl('/admin/login');

  const admin   = adminAuth.getAdmin();
  const routeId = Number(route.paramMap.get('id'));
  if (Number.isFinite(routeId) && routeId !== admin?.id) {
    return router.parseUrl('/forbidden');
  }
  return true;
};
