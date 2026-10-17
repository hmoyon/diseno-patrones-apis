import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, finalize, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Employee, NewEmployee } from '../models/employee';

/**
 * Servicio reactivo (store) de empleados.
 * - El estado vive en BehaviorSubject PRIVADOS: nadie fuera del servicio puede emitir.
 * - Se expone hacia afuera solo como Observable$ de solo lectura (asObservable()).
 * - Cada cambio crea un arreglo NUEVO (inmutabilidad): nunca push/splice.
 * - Los componentes NO llaman a HttpClient ni hacen .subscribe(): usan async pipe.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  // ---- Estado privado ----
  private readonly employeesSubject = new BehaviorSubject<Employee[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorsSubject = new BehaviorSubject<string[] | null>(null);

  // ---- Flujos públicos de solo lectura ----
  readonly employees$ = this.employeesSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly errors$ = this.errorsSubject.asObservable();

  /** Carga inicial de la lista. */
  loadAll(): void {
    this.loadingSubject.next(true);
    this.http
      .get<ApiResponse<Employee[]>>(this.apiUrl)
      .pipe(
        map((res) => res.data ?? []),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe({
        next: (list) => {
          this.employeesSubject.next(list);
          this.clearErrors();
        },
        error: (err) => this.handleError(err),
      });
  }

  /** Crea y agrega al estado: [...current, nuevo]. */
  create(data: NewEmployee, onSuccess?: () => void): void {
    this.http
      .post<ApiResponse<Employee>>(this.apiUrl, data)
      .pipe(map((res) => res.data as Employee))
      .subscribe({
        next: (created) => {
          const current = this.employeesSubject.getValue();
          this.employeesSubject.next([...current, created]);
          this.clearErrors();
          onSuccess?.();
        },
        error: (err) => this.handleError(err),
      });
  }

  /** Actualiza y reemplaza en el estado con map() (nuevo arreglo). */
  update(id: string, data: Partial<NewEmployee>, onSuccess?: () => void): void {
    this.http
      .put<ApiResponse<Employee>>(`${this.apiUrl}/${id}`, data)
      .pipe(map((res) => res.data as Employee))
      .subscribe({
        next: (updated) => {
          const current = this.employeesSubject.getValue();
          this.employeesSubject.next(current.map((e) => (e.id === id ? updated : e)));
          this.clearErrors();
          onSuccess?.();
        },
        error: (err) => this.handleError(err),
      });
  }

  /** Elimina y filtra del estado con filter() (nuevo arreglo). */
  delete(id: string, onSuccess?: () => void): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        const current = this.employeesSubject.getValue();
        this.employeesSubject.next(current.filter((e) => e.id !== id));
        this.clearErrors();
        onSuccess?.();
      },
      error: (err) => this.handleError(err),
    });
  }

  clearErrors(): void {
    this.errorsSubject.next(null);
  }

  /** Traduce el Response Wrapper de error del backend a mensajes legibles. */
  private handleError(err: HttpErrorResponse): void {
    const body = err.error as ApiResponse<null> | null;
    if (body?.errors?.length) {
      this.errorsSubject.next(body.errors.map((e) => `${e.field}: ${e.message}`));
    } else if (body?.message) {
      this.errorsSubject.next([body.message]);
    } else {
      this.errorsSubject.next(['No se pudo conectar con el servidor']);
    }
  }
}
