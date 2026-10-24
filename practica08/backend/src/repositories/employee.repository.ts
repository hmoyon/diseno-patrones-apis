import type { Employee, NewEmployee, UpdateEmployee } from '../domain/employee.js';

// Contrato abstracto de persistencia (Patrón Repository).
// Los controladores dependen de esta interfaz, nunca de una implementación concreta.
export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(data: NewEmployee): Promise<Employee>;
  update(id: string, data: UpdateEmployee): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}
