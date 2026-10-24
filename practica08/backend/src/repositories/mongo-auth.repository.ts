import { UserModel } from '../models/user.model.js';
import type { NewUser, User } from '../domain/user.js';
import type { IAuthRepository } from './auth.repository.js';

export class MongoAuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select('+password') // se pide el hash solo aquí, para compararlo
      .lean();
    return doc ? toEntity(doc) : null;
  }

  async createUser(data: NewUser): Promise<User> {
    const doc = await UserModel.create({
      email: data.email,
      password: data.passwordHash,
      rol: data.rol ?? 'alumno',
    });
    return toEntity(doc.toObject());
  }
}

// Traduce el documento de Mongo a la entidad de dominio (_id -> id).
interface UserRecord {
  _id: { toString(): string };
  email: string;
  password: string;
  rol: string;
}

function toEntity(doc: UserRecord): User {
  return { id: doc._id.toString(), email: doc.email, passwordHash: doc.password, rol: doc.rol };
}