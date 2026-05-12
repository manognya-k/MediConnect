import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Use the admin token when the current tab is on an admin route, and the
  // patient token otherwise. This prevents a patient login on another tab
  // from overwriting the admin session (both share the same localStorage).
  const isAdminPortal = window.location.pathname.startsWith('/admin');

  const token = isAdminPortal
    ? localStorage.getItem('mediconnect_admin_token')
    : inject(AuthService).getToken();

  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
