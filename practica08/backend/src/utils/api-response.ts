import type { Response } from 'express';

// ---------- Response Wrapper Pattern ----------
// Todas las respuestas (éxito y error) comparten esta misma forma.
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: ApiErrorDetail[];
  timestamp: string;
}

export const sendSuccess = <T>(res: Response, data: T, message = 'Operación exitosa', statusCode = 200): void => {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
};

export const sendError = (res: Response, statusCode: number, message: string, errors?: ApiErrorDetail[]): void => {
  const body: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
  if (errors && errors.length > 0) body.errors = errors;
  res.status(statusCode).json(body);
};
