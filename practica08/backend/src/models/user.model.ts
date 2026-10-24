import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false -> el hash nunca sale en las consultas salvo que se pida explícitamente.
    password: { type: String, required: true, select: false },
    rol: { type: String, default: 'alumno' },
  },
  { timestamps: true, versionKey: false }
);

export const UserModel = model('User', userSchema, 'usuarios');