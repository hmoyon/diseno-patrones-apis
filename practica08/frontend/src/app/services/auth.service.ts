import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { AuthUser, LoginCredentials, LoginResponse } from '../models/auth';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Estado reactivo de la sesión: única fuente de verdad para la UI.
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/login`, credentials).pipe(
      map((res) => {
        if (!res.success || !res.data) throw new Error(res.message || 'No se pudo iniciar sesión');
        return res.data; // desempaqueta el Response Wrapper
      }),
      tap(({ token, user }) => {
        this.storage?.setItem(TOKEN_KEY, token);
        this.storage?.setItem(USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      map(({ user }) => user),
      catchError((err) => throwError(() => new Error(this.toMessage(err))))
    );
  }

  logout(): void {
    this.storage?.removeItem(TOKEN_KEY);
    this.storage?.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return this.storage?.getItem(TOKEN_KEY) ?? null;
  }

  /** Hay token y todavía no venció. */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  private get storage(): Storage | null {
    return this.isBrowser ? localStorage : null;
  }

  private readUser(): AuthUser | null {
    const raw = this.storage?.getItem(USER_KEY);
    if (!raw || !this.getToken()) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  // Lee "exp" del JWT solo para saber si venció. La firma la valida el backend.
  private isExpired(token: string): boolean {
    try {
      const part = token.split('.')[1] ?? '';
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  // Traduce el error del backend (ApiResponse) a un mensaje para la vista.
  private toMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse<null> | null;
      if (body?.errors?.length) return body.errors.map((e) => e.message).join('. ');
      if (body?.message) return body.message;
      if (err.status === 0) return 'No se pudo conectar con el servidor';
    }
    return err instanceof Error ? err.message : 'Error inesperado al iniciar sesión';
  }
}