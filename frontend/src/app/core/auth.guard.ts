import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Protect shell routes. If we don't yet know the auth state (page reload
 * before /me has resolved), call /me once and decide. Authenticated users
 * see the route; everyone else is sent to /login.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isResolved()) {
    return of(decide(auth.isAuthenticated(), router));
  }
  return auth.refresh().pipe(map((u) => decide(u != null, router)));
};

function decide(authed: boolean, router: Router): boolean | UrlTree {
  return authed ? true : router.parseUrl('/login');
}
