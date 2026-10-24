import { Router } from 'express';
import type { EmployeeController } from '../controllers/employee.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeIdParamDto } from '../dtos/employee.dto.js';

// Cadena por ruta: JWT -> validación (DTO) -> controlador.
export const employeeRoutes = (controller: EmployeeController): Router => {
  const router = Router();

  router.get('/employees', authenticateJWT, controller.getAll);
  router.get('/employees/:id', authenticateJWT, validate({ params: EmployeeIdParamDto }), controller.getById);
  router.post('/employees', authenticateJWT, validate({ body: CreateEmployeeDto }), controller.create);
  router.put('/employees/:id', authenticateJWT, validate({ params: EmployeeIdParamDto, body: UpdateEmployeeDto }), controller.update);
  router.delete('/employees/:id', authenticateJWT, validate({ params: EmployeeIdParamDto }), controller.delete);

  return router;
};