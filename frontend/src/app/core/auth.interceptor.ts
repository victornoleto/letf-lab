import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Two responsibilities:
 * 1. Send the session cookie on every same-origin and cross-origin call to
 *    our API by setting `withCredentials: true`. Required for the HttpOnly
 *    JWT cookie to ride along.
 * 2. On 401 from a protected endpoint, mark the auth state as anonymous and
 *    bounce the user to /login. Login/logout calls are exempt from the
 *    redirect to avoid loops on bad credentials.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const apiReq = req.clone({ withCredentials: true });

  return next(apiReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const isAuthRoute = req.url.includes('/api/auth/');
        if (!isAuthRoute) {
          auth.user.set(null);
          if (!router.url.startsWith('/login')) {
            router.navigate(['/login']);
          }
        }
      }
      return throwError(() => err);
    }),
  );
};
