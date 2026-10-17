import { Component, OnInit, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee';

// Modelo local del formulario (copia, nunca la referencia de la tabla).
interface EmployeeForm {
  id?: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number | null;
}

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrl: './empleado.component.css',
})
export class EmpleadoComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  // Flujos reactivos: la vista los consume con el async pipe (sin .subscribe()).
  readonly employees$ = this.employeeService.employees$;
  readonly loading$ = this.employeeService.loading$;
  readonly errors$ = this.employeeService.errors$;

  form: EmployeeForm = this.emptyForm();

  ngOnInit(): void {
    this.employeeService.loadAll();
  }

  save(ngForm: NgForm): void {
    const { id, ...data } = this.form;
    const payload = { ...data, sueldo: Number(data.sueldo) };
    const done = () => this.reset(ngForm);

    if (id) {
      this.employeeService.update(id, payload, done);
    } else {
      this.employeeService.create(payload, done);
    }
  }

  edit(employee: Employee): void {
    // Se crea una COPIA con solo los campos editables:
    // así no se muta la fila de la tabla mientras se edita.
    const { id, nombre, cargo, departamento, sueldo } = employee;
    this.form = { id, nombre, cargo, departamento, sueldo };
    this.employeeService.clearErrors();
  }

  remove(employee: Employee): void {
    if (!confirm(`¿Eliminar a ${employee.nombre}?`)) return;
    this.employeeService.delete(employee.id);
    if (this.form.id === employee.id) this.form = this.emptyForm();
  }

  reset(ngForm: NgForm): void {
    this.form = this.emptyForm();
    ngForm.resetForm(this.form);
    this.employeeService.clearErrors();
  }

  trackById(_index: number, employee: Employee): string {
    return employee.id;
  }

  private emptyForm(): EmployeeForm {
    return { nombre: '', cargo: '', departamento: '', sueldo: null };
  }
}
