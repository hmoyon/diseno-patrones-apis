// Entidad de dominio: no depende de Mongoose ni de Express.
export interface Employee {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Datos necesarios para crear un empleado (sin campos generados por la BD).
export type NewEmployee = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;

// Datos para una actualización parcial.
export type UpdateEmployee = Partial<NewEmployee>;
