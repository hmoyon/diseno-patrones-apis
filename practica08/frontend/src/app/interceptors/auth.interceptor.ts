import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Agrega el JWT a cada petición y reacciona si el backend lo rechaza.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isLogin = req.url.endsWith('/auth/login');
  const token = auth.getToken();

  const request = token && !isLogin
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      // 401 sin token / 403 token vencido o alterado -> se cierra la sesión.
      if (!isLogin && err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { expired: 1 } });
      }
      return throwError(() => err);
    })
  );
};