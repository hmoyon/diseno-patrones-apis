   import { describe, it, expect, jest } from '@jest/globals';
   import type { Request, Response, NextFunction } from 'express';
   import { ZodError } from 'zod';
   import { validate } from './validate.middleware.js';
   import { CreateEmployeeDto } from '../dtos/employee.dto.js';

   describe('🛡️ Unit Test: validate middleware (rechazo perimetral)', () => {
     const middleware = validate({ body: CreateEmployeeDto });

     it.each([-1, -500, -999999])('Bloquea sueldo negativo (%p) y NO llama al controlador', (sueldo) => {
       const req = { body: { nombre: 'Carlos Pérez', cargo: 'Analista', departamento: 'TI', sueldo } } as Request;
       const next = jest.fn() as unknown as NextFunction;

       expect(() => middleware(req, {} as Response, next)).toThrow(ZodError);
       expect(next).not.toHaveBeenCalled();
     });

     it('Deja pasar un sueldo válido y llama a next()', () => {
       const req = { body: { nombre: 'Carlos Pérez', cargo: 'Analista', departamento: 'TI', sueldo: 1500 } } as Request;
       const next = jest.fn() as unknown as NextFunction;

       middleware(req, {} as Response, next);
       expect(next).toHaveBeenCalledTimes(1);
     });
   });