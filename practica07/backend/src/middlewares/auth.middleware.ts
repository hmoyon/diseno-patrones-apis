import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import type { AuthUser } from '../domain/user.js';

// Request con el usuario autenticado inyectado por el middleware.
export interface IAuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateJWT = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Acceso denegado: no se proporcionó un token de autenticación válido');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    (req as IAuthRequest).user = { id: payload.id, email: payload.email, rol: payload.rol };
  } catch {
    throw new ForbiddenError('El token proporcionado ha expirado o su firma es inválida');
  }

  next();
};