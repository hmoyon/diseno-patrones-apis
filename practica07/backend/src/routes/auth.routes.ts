import { Router } from 'express';
import type { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { LoginDto } from '../dtos/auth.dto.js';

export const authRoutes = (controller: AuthController): Router => {
  const router = Router();

  // Login blindado con el DTO de Zod
  router.post('/auth/login', validate({ body: LoginDto }), controller.login);

  return router;
};