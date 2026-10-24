import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee';
import { EmployeeFormValue } from '../employee-form/employee-form.component';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Datos del bloque de resumen superior. */
interface EmployeeStats {
  total: number;
  promedio: number;
  departamentos: number;
}

/**
 * SMART COMPONENT (Orquestador / Contenedor)
 * - Es el ÚNICO componente que conoce al servicio.
 * - Consume los observables con el async pipe (sin .subscribe()).
 * - Decide QUÉ hacer ante los eventos que emiten los componentes Dumb.
 * - No dibuja formularios ni tablas: delega la presentación.
 * - Además orquesta el estado de la vista: búsqueda, cajón del
 *   formulario y avisos (toast).
 */
@Component({
  selector: 'app-employee-page',
  templateUrl: './employee-page.component.html',
  styleUrl: './employee-page.component.css',
})
export class EmployeePageComponent implements OnInit, OnDestroy {
  private readonly employeeService = inject(EmployeeService);

  // ---- Flujos del servicio ----
  readonly employees$ = this.employeeService.employees$;
  readonly loading$ = this.employeeService.loading$;
  readonly errors$ = this.employeeService.errors$;

  // ---- Búsqueda (estado local de la vista) ----
  private readonly searchSubject = new BehaviorSubject<string>('');
  readonly search$ = this.searchSubject.asObservable();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly currentUser$ = this.authService.currentUser$;

  /** Lista filtrada por el texto de búsqueda (derivada, sin mutar el estado). */
  readonly filtered$ = combineLatest([this.employees$, this.searchSubject]).pipe(
    map(([list, term]) => {
      const q = term.trim().toLowerCase();
      if (!q) return list;
      return list.filter((e) =>
        `${e.nombre} ${e.cargo} ${e.departamento}`.toLowerCase().includes(q)
      );
    })
  );

  /** Resumen calculado a partir de la lista completa. */
  readonly stats$ = this.employees$.pipe(
    map((list): EmployeeStats => {
      const total = list.length;
      const suma = list.reduce((acc, e) => acc + Number(e.sueldo || 0), 0);
      return {
        total,
        promedio: total ? suma / total : 0,
        departamentos: new Set(list.map((e) => e.departamento.trim().toLowerCase())).size,
      };
    })
  );

  // ---- Estado de la vista que orquesta el Smart ----
  selected: Employee | null = null; // empleado en edición
  resetKey = 0;                     // al cambiar, el formulario se limpia
  drawerOpen = false;               // cajón lateral del formulario
  toast: string | null = null;      // mensaje breve de confirmación
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.employeeService.loadAll();
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
  }

  /** Esc cierra el cajón. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.onCancel();
  }

  // ---- Acciones de la vista ----

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  openNew(): void {
    this.selected = null;
    this.resetKey++;
    this.employeeService.clearErrors();
    this.drawerOpen = true;
  }

  // ---- Reacciones a eventos de los componentes Dumb ----

  onSave(value: EmployeeFormValue): void {
    const { id, ...data } = value;
    this.employeeService.clearErrors();

    const done = () => {
      this.closeDrawer();
      this.showToast(id ? 'Empleado actualizado' : 'Empleado creado');
    };

    if (id) {
      this.employeeService.update(id, data, done);
    } else {
      this.employeeService.create(data, done);
    }
  }

  onEdit(employee: Employee): void {
    this.selected = employee; // el formulario se encarga de clonarlo
    this.employeeService.clearErrors();
    this.drawerOpen = true;
  }

  /** La tabla ya pidió confirmación en la propia fila. */
  onRemove(employee: Employee): void {
    this.employeeService.delete(employee.id, () => {
      if (this.selected?.id === employee.id) this.closeDrawer();
      this.showToast('Empleado eliminado');
    });
  }

  onCancel(): void {
    this.closeDrawer();
    this.employeeService.clearErrors();
  }

  private closeDrawer(): void {
    this.drawerOpen = false;
    this.selected = null;
    this.resetKey++;
  }

  private showToast(message: string): void {
    this.toast = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2500);
  }

  


  logout(): void {
  this.authService.logout();
  this.router.navigate(['/login']);
  }
}
