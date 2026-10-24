// Errores de negocio controlados: llevan su propio código HTTP.
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

// 401: no hay token o las credenciales no son válidas.
export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

// 403: el token existe pero está vencido o su firma es inválida.
export class ForbiddenError extends AppError {
  constructor(message = 'Acceso prohibido') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}