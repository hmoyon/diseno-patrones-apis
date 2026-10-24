import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { IAuthRepository } from '../repositories/auth.repository.js';
import type { LoginInput } from '../dtos/auth.dto.js';
import type { AuthUser } from '../domain/user.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/app-error.js';
import { sendSuccess } from '../utils/api-response.js';

const INVALID_CREDENTIALS = 'Credenciales inválidas';

export class AuthController {
  constructor(private readonly repository: IAuthRepository) {}

  login = async (req: Request<{}, unknown, LoginInput>, res: Response) => {
    const { email, password } = req.body;

    // 1. Verificar que la identidad existe
    const user = await this.repository.findByEmail(email);
    if (!user) throw new UnauthorizedError(INVALID_CREDENTIALS);

    // 2. Comparar la contraseña con el hash guardado
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedError(INVALID_CREDENTIALS);

    // 3. Firmar el JWT (vence según JWT_EXPIRES_IN, por defecto 2h)
    const authUser: AuthUser = { id: user.id, email: user.email, rol: user.rol };
    const token = jwt.sign(authUser, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as NonNullable<SignOptions['expiresIn']>,
    });

    // 4. Respuesta con el formato estándar del proyecto
    sendSuccess(res, { token, user: authUser }, 'Inicio de sesión exitoso');
  };
}