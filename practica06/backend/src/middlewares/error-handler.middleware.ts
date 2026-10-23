import type { ErrorRequestHandler, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { sendError } from '../utils/api-response.js';

// 404 para rutas que no existen (se registra después de todas las rutas).
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
};

// Interceptor global: transforma cualquier excepción en el formato universal.
// Nunca expone detalles internos (stack, mensajes de Mongo) al cliente.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Errores de validación Zod -> 400 con la lista de campos inválidos
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.map(String).join('.') || 'body',
      message: issue.message,
    }));
    sendError(res, 400, 'Datos de entrada inválidos', errors);
    return;
  }

  // 2. Errores de negocio controlados (404, 409, ...)
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message);
    return;
  }

  // 3. JSON mal formado en el body
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'El cuerpo de la petición no es un JSON válido');
    return;
  }

  // 4. Cualquier otro error: se registra en el servidor y se responde genérico
  console.error('❌ [Error no controlado]:', err);
  sendError(res, 500, 'Error interno del servidor');
};
