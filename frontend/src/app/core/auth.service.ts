import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const BASE_URL = '/api/auth';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** Resolved on first /me call. null = anonymous; undefined = not yet checked. */
  readonly user = signal<AuthUser | null | undefined>(undefined);
  readonly isAuthenticated = computed(() => this.user() != null);
  readonly isResolved = computed(() => this.user() !== undefined);

  /** Best-effort refresh from cookie. Resolves on success or 401. */
  refresh(): Observable<AuthUser | null> {
    return new Observable<AuthUser | null>((subscriber) => {
      this.http.get<AuthUser>(`${BASE_URL}/me`, { withCredentials: true }).subscribe({
        next: (u) => {
          this.user.set(u);
          subscriber.next(u);
          subscriber.complete();
        },
        error: () => {
          this.user.set(null);
          subscriber.next(null);
          subscriber.complete();
        },
      });
    });
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${BASE_URL}/login`, { email, password }, { withCredentials: true })
      .pipe(tap((u) => this.user.set(u)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${BASE_URL}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.user.set(null)));
  }
}
