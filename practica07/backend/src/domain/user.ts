// Entidad de dominio: no depende de Mongoose ni de Express.
export interface User {
  id: string;
  email: string;
  passwordHash: string; // hash bcrypt, nunca la contraseña en texto plano
  rol: string;
}

// Datos para registrar un usuario.
export interface NewUser {
  email: string;
  passwordHash: string;
  rol?: string;
}

// Lo que viaja dentro del token y en la respuesta del login (sin el hash).
export interface AuthUser {
  id: string;
  email: string;
  rol: string;
}