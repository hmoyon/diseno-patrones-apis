import type { NewUser, User } from '../domain/user.js';

// Contrato abstracto de persistencia de credenciales (Patrón Repository).
export interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  createUser(data: NewUser): Promise<User>;
}