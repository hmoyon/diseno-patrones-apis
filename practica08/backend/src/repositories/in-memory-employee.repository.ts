import { randomUUID } from 'node:crypto';
import type { Employee, NewEmployee, UpdateEmployee } from '../domain/employee.js';
import type { IEmployeeRepository } from './employee.repository.js';

// Implementación alternativa en memoria.
// Demuestra el desacoplamiento: el controlador funciona igual sin MongoDB.
export class InMemoryEmployeeRepository implements IEmployeeRepository {
  private employees: Employee[] = [];

  async findAll(): Promise<Employee[]> {
    return [...this.employees];
  }

  async findById(id: string): Promise<Employee | null> {
    return this.employees.find((e) => e.id === id) ?? null;
  }

  async create(data: NewEmployee): Promise<Employee> {
    const now = new Date();
    const employee: Employee = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
    this.employees = [...this.employees, employee];
    return employee;
  }

  async update(id: string, data: UpdateEmployee): Promise<Employee | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const updated: Employee = { ...current, ...data, updatedAt: new Date() };
    this.employees = this.employees.map((e) => (e.id === id ? updated : e));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.employees.length;
    this.employees = this.employees.filter((e) => e.id !== id);
    return this.employees.length < before;
  }
}
