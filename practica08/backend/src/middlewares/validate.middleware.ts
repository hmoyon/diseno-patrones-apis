import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
}

// Valida req.params y req.body ANTES de llegar al controlador.
// Si falla, Zod lanza ZodError y el middleware global de errores responde 400.
export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      schemas.params.parse(req.params);
    }
    if (schemas.body) {
      // Se reemplaza el body por la versión limpia (trim, sin claves extra).
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
