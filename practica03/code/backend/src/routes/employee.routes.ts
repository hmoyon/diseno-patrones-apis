import { Router } from 'express';
import type { EmployeeController } from '../controllers/employee.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeIdParamDto } from '../dtos/employee.dto.js';

// Fábrica de rutas: recibe el controlador ya construido.
// Cada ruta pasa primero por la validación perimetral (DTO con Zod).
export const employeeRoutes = (controller: EmployeeController): Router => {
  const router = Router();

  router.get('/employees', controller.getAll);
  router.get('/employees/:id', validate({ params: EmployeeIdParamDto }), controller.getById);
  router.post('/employees', validate({ body: CreateEmployeeDto }), controller.create);
  router.put('/employees/:id', validate({ params: EmployeeIdParamDto, body: UpdateEmployeeDto }), controller.update);
  router.delete('/employees/:id', validate({ params: EmployeeIdParamDto }), controller.delete);

  return router;
};
