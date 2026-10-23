import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Employee } from '../../models/employee';

/**
 * DUMB COMPONENT (Presentacional) — Tabla
 * - No inyecta servicios: solo pinta lo que recibe.
 * - Entradas: @Input() employees, @Input() selectedId, @Input() emptyMessage
 * - Salidas:  @Output() edit, @Output() remove
 * - OnPush: solo se redibuja cuando cambia la REFERENCIA del arreglo,
 *   lo que funciona gracias a la inmutabilidad del servicio (Reto 3).
 * - La confirmación de borrado es estado puramente visual, por eso vive
 *   aquí: "remove" solo se emite cuando el usuario confirma.
 */
@Component({
  selector: 'app-employee-table',
  templateUrl: './employee-table.component.html',
  styleUrl: './employee-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeTableComponent {
  @Input() employees: readonly Employee[] = [];
  @Input() selectedId: string | null = null;
  @Input() emptyMessage = 'No hay empleados registrados.';

  @Output() readonly edit = new EventEmitter<Employee>();
  @Output() readonly remove = new EventEmitter<Employee>();

  /** Fila que está pidiendo confirmación para eliminar. */
  confirmingId: string | null = null;

  trackById(_index: number, employee: Employee): string {
    return employee.id;
  }

  /** Iniciales para el avatar (máximo 2 letras). */
  initials(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  askRemove(employee: Employee): void {
    this.confirmingId = employee.id;
  }

  cancelRemove(): void {
    this.confirmingId = null;
  }

  confirmRemove(employee: Employee): void {
    this.confirmingId = null;
    this.remove.emit(employee);
  }
}
