import { describe, it, expect } from '@jest/globals';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeIdParamDto } from './employee.dto.js';

// Pruebas unitarias del contrato perimetral (Zod): mismas reglas que se
// estresan con Artillery en la Fase B.
describe('🛡️ Unit Test: Employee DTO (Resiliencia perimetral con Zod)', () => {
  const fieldsOf = (issues: { path: PropertyKey[] }[]) => issues.map((i) => i.path.map(String).join('.'));

  it('Acepta el payload válido del escenario de estrés y recorta espacios', () => {
    const result = CreateEmployeeDto.safeParse({
      nombre: '  Andrés Mendoza  ', cargo: 'Software Architect', departamento: 'I+D', sueldo: 4200,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nombre).toBe('Andrés Mendoza');
  });

  it('Rechaza el payload corrupto del escenario de estrés (nombre corto y sueldo negativo)', () => {
    const result = CreateEmployeeDto.safeParse({ nombre: 'Al', cargo: 'Dev', departamento: 'TI', sueldo: -500 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldsOf(result.error.issues)).toEqual(expect.arrayContaining(['nombre', 'sueldo']));
    }
  });

  it('Rechaza sueldo igual a 0 y tipos incorrectos', () => {
    expect(CreateEmployeeDto.safeParse({ nombre: 'Carlos', cargo: 'QA', departamento: 'TI', sueldo: 0 }).success).toBe(false);
    expect(CreateEmployeeDto.safeParse({ nombre: 'Carlos', cargo: 'QA', departamento: 'TI', sueldo: 'mucho' }).success).toBe(false);
  });

  it('Descarta claves no declaradas en el contrato', () => {
    const result = CreateEmployeeDto.safeParse({ nombre: 'Carlos', cargo: 'QA', departamento: 'TI', sueldo: 900, admin: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('admin');
  });

  it('Exige al menos un campo en la actualización', () => {
    expect(UpdateEmployeeDto.safeParse({}).success).toBe(false);
    expect(UpdateEmployeeDto.safeParse({ sueldo: 5200 }).success).toBe(true);
  });

  it('Valida el formato del ID (ObjectId o UUID)', () => {
    expect(EmployeeIdParamDto.safeParse({ id: '123' }).success).toBe(false);
    expect(EmployeeIdParamDto.safeParse({ id: '6acd3d7639897115a38f6bfb' }).success).toBe(true);
    expect(EmployeeIdParamDto.safeParse({ id: '11f2d145-b83f-4b60-bc11-bd7649d683d0' }).success).toBe(true);
  });

    // Varios sueldos negativos en una sola prueba parametrizada
  it.each([-1, -0.01])(
    'Rechaza sueldo negativo en la creación (%p)',
    (sueldo) => {
      const result = CreateEmployeeDto.safeParse({
        nombre: 'Carlos Pérez', cargo: 'Analista', departamento: 'TI', sueldo,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['sueldo']);
        expect(result.error.issues[0]?.message).toBe('El sueldo debe ser mayor a 0');
      }
    }
  );

  it('Rechaza sueldo negativo en la actualización parcial', () => {
    const result = UpdateEmployeeDto.safeParse({ sueldo: -1200 });
    expect(result.success).toBe(false);
  });
});

