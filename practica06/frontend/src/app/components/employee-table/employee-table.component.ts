import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Employee } from '../../models/employee';

/**
 * DUMB COMPONENT (Presentacional) — Tabla
 * - No inyecta servicios: solo pinta lo que recibe.
 * - Entradas: @Input() employees, @Input() selectedId
 * - Salidas:  @Output() edit, @Output() remove
 * - OnPush: solo se redibuja cuando cambia la REFERENCIA del arreglo,
 *   lo que funciona gracias a la inmutabilidad del servicio (Reto 3).
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

  @Output() readonly edit = new EventEmitter<Employee>();
  @Output() readonly remove = new EventEmitter<Employee>();

  trackById(_index: number, employee: Employee): string {
    return employee.id;
  }
}
