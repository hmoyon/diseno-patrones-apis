import type { Request, Response } from 'express';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import type { NewEmployee, UpdateEmployee } from '../domain/employee.js';
import { NotFoundError } from '../errors/app-error.js';
import { sendSuccess } from '../utils/api-response.js';

// El controlador NO importa mongoose ni el modelo:
// solo conoce la abstracción IEmployeeRepository, inyectada por constructor.
// Los datos ya llegan validados por Zod (middleware validate) y los errores
// se lanzan con throw: Express 5 los envía al middleware global de errores.
type IdParams = { id: string };

export class EmployeeController {
  constructor(private readonly repository: IEmployeeRepository) {}

  getAll = async (_req: Request, res: Response) => {
    const employees = await this.repository.findAll();
    sendSuccess(res, employees, 'Empleados obtenidos correctamente');
  };

  getById = async (req: Request<IdParams>, res: Response) => {
    const employee = await this.repository.findById(req.params.id);
    if (!employee) throw new NotFoundError('Empleado no encontrado');
    sendSuccess(res, employee, 'Empleado encontrado');
  };

  create = async (req: Request<{}, unknown, NewEmployee>, res: Response) => {
    const employee = await this.repository.create(req.body);
    sendSuccess(res, employee, 'Empleado creado correctamente', 201);
  };

  update = async (req: Request<IdParams, unknown, UpdateEmployee>, res: Response) => {
    const employee = await this.repository.update(req.params.id, req.body);
    if (!employee) throw new NotFoundError('Empleado no encontrado');
    sendSuccess(res, employee, 'Empleado actualizado correctamente');
  };

  delete = async (req: Request<IdParams>, res: Response) => {
    const deleted = await this.repository.delete(req.params.id);
    if (!deleted) throw new NotFoundError('Empleado no encontrado');
    sendSuccess(res, null, 'Empleado eliminado correctamente');
  };
}
