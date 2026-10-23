// Entidad tal como la entrega el backend (el repositorio ya convierte _id -> id).
export interface Employee {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: string;
  updatedAt?: string;
}

// Datos que se envían al crear (sin campos generados por el servidor).
export type NewEmployee = Pick<Employee, 'nombre' | 'cargo' | 'departamento' | 'sueldo'>;
