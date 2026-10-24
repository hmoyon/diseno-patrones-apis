export interface LoginCredentials {
  email: string;
  password: string;
}

// Usuario que devuelve el backend (lo mismo que va dentro del JWT).
export interface AuthUser {
  id: string;
  email: string;
  rol: string;
}

// Contenido de "data" en la respuesta del login.
export interface LoginResponse {
  token: string;
  user: AuthUser;
}