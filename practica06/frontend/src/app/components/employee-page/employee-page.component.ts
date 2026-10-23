import { Component, OnInit, inject } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee';
import { EmployeeFormValue } from '../employee-form/employee-form.component';

/**
 * SMART COMPONENT (Orquestador / Contenedor)
 * - Es el ÚNICO componente que conoce al servicio.
 * - Consume los observables con el async pipe (sin .subscribe()).
 * - Decide QUÉ hacer ante los eventos que emiten los componentes Dumb.
 * - No dibuja formularios ni tablas: delega la presentación.
 */
@Component({
  selector: 'app-employee-page',
  templateUrl: './employee-page.component.html',
  styleUrl: './employee-page.component.css',
})
export class EmployeePageComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  // Flujos reactivos que se pasan a los Dumb mediante async pipe
  readonly employees$ = this.employeeService.employees$;
  readonly loading$ = this.employeeService.loading$;
  readonly errors$ = this.employeeService.errors$;

  // Estado de la vista que orquesta el Smart
  selected: Employee | null = null; // empleado en edición
  resetKey = 0;                     // al cambiar, el formulario se limpia

  ngOnInit(): void {
    this.employeeService.loadAll();
  }

  // ---- Reacciones a eventos de los componentes Dumb ----

  onSave(value: EmployeeFormValue): void {
    const { id, ...data } = value;
    const done = () => this.resetForm();

    if (id) {
      this.employeeService.update(id, data, done);
    } else {
      this.employeeService.create(data, done);
    }
  }

  onEdit(employee: Employee): void {
    this.selected = employee; // el formulario se encarga de clonarlo
    this.employeeService.clearErrors();
  }

  onRemove(employee: Employee): void {
    if (!confirm(`¿Eliminar a ${employee.nombre}?`)) return;
    this.employeeService.delete(employee.id, () => {
      if (this.selected?.id === employee.id) this.resetForm();
    });
  }

  onCancel(): void {
    this.resetForm();
    this.employeeService.clearErrors();
  }

  private resetForm(): void {
    this.selected = null;
    this.resetKey++;
  }
}
