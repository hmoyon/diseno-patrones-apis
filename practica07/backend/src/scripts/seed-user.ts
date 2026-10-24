import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { MongoAuthRepository } from '../repositories/mongo-auth.repository.js';

// Uso: npm run seed:user -- [email] [contraseña] [rol]
const email = process.argv[2] ?? 'admin@ups.edu.ec';
const password = process.argv[3] ?? 'Admin2026';
const rol = process.argv[4] ?? 'admin';

await connectDatabase();
const repository = new MongoAuthRepository();

if (await repository.findByEmail(email)) {
  console.log(`ℹ️  El usuario ${email} ya existe`);
} else {
  const passwordHash = await bcrypt.hash(password, 10); // 10 rondas de sal
  await repository.createUser({ email, passwordHash, rol });
  console.log(`✅ Usuario creado: ${email}`);
}

await mongoose.disconnect();