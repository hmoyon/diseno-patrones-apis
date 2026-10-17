import { z } from 'zod';

// ---------- Esquemas declarativos (validación perimetral) ----------

// Body para crear un empleado. Las claves no declaradas se descartan automáticamente.
export const CreateEmployeeDto = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  cargo: z.string().trim().min(2, 'El cargo debe tener al menos 2 caracteres').max(100),
  departamento: z.string().trim().min(2, 'El departamento debe tener al menos 2 caracteres').max(100),
  sueldo: z.number().positive('El sueldo debe ser mayor a 0'),
});

// Body para actualizar: todos los campos opcionales, pero al menos uno.
export const UpdateEmployeeDto = CreateEmployeeDto.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);

// Parámetro :id -> ObjectId de MongoDB (24 hex) o UUID (repositorio en memoria).
export const EmployeeIdParamDto = z.object({
  id: z
    .string()
    .trim()
    .regex(/^([a-f\d]{24}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i, 'El id no tiene un formato válido'),
});

// Tipos TypeScript derivados de los esquemas (una sola fuente de verdad).
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeDto>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeDto>;
export type EmployeeIdParam = z.infer<typeof EmployeeIdParamDto>;
