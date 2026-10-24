import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('🔄 [Database]: Conexión exitosa a MongoDB');
  } catch (error) {
    console.error('❌ Error crítico al conectar a la base de datos:', error);
    process.exit(1);
  }
};