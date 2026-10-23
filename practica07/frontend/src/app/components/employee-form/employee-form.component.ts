import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Employee, NewEmployee } from '../../models/employee';

/** Valor que emite el formulario al guardar (id presente = edición). */
export interface EmployeeFormValue extends NewEmployee {
  id?: string;
}

/** Modelo interno del formulario (copia local, nunca la referencia de la tabla). */
interface EmployeeFormModel {
  id?: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number | null;
}

/**
 * DUMB COMPONENT (Presentacional) — Formulario
 * - No inyecta servicios ni conoce HttpClient.
 * - Entradas: @Input() employee, @Input() resetKey, @Input() errors
 * - Salidas:  @Output() save, @Output() cancel
 * - CLONA su entrada: editar aquí no muta la fila de la tabla.
 */
@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnChanges {
  @Input() employee: Employee | null = null;
  @Input() resetKey = 0;
  /** Mensajes de error del backend que el contenedor decide mostrar aquí. */
  @Input() errors: string[] | null = null;

  @Output() readonly save = new EventEmitter<EmployeeFormValue>();
  @Output() readonly cancel = new EventEmitter<void>();

  model: EmployeeFormModel = this.emptyModel();

  // Solo se reconstruye la copia local si cambian employee o resetKey,
  // para no borrar lo escrito cuando únicamente llegan errores.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] || changes['resetKey']) {
      this.model = this.employee ? this.cloneFrom(this.employee) : this.emptyModel();
    }
  }

  get isEditing(): boolean {
    return !!this.model.id;
  }

  submit(): void {
    const { id, nombre, cargo, departamento, sueldo } = this.model;
    // Se emite un objeto NUEVO, no la referencia interna.
    this.save.emit({
      id,
      nombre: nombre.trim(),
      cargo: cargo.trim(),
      departamento: departamento.trim(),
      sueldo: Number(sueldo),
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private cloneFrom(e: Employee): EmployeeFormModel {
    return { id: e.id, nombre: e.nombre, cargo: e.cargo, departamento: e.departamento, sueldo: e.sueldo };
  }

  private emptyModel(): EmployeeFormModel {
    return { nombre: '', cargo: '', departamento: '', sueldo: null };
  }
}
