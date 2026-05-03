import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from '../admin/services/admin-auth.service';

export const adminAuthGuard = () => {
  const adminAuth = inject(AdminAuthService);
  const router    = inject(Router);

  if (adminAuth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/admin/login');
};
