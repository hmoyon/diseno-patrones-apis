// src/config/database.ts
import mongoose from 'mongoose';

// La cadena de conexión se toma de la variable de entorno MONGO_URI.
// Si no existe, se usa MongoDB local (comportamiento anterior).
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1/usuarios_db';
const ORIGEN = MONGO_URI.startsWith('mongodb+srv://') ? 'MongoDB Atlas (nube)' : 'MongoDB local';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🔄 [Database]: Conexión exitosa a ${ORIGEN}`);
    console.log(`📍 [Database]: Servidor = ${mongoose.connection.host} · Base = ${mongoose.connection.name}`);
  } catch (error) {
    console.error(`❌ Error crítico al conectar a ${ORIGEN}:`, error);
    process.exit(1);
  }
};