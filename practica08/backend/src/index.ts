import 'dotenv/config'; // SIEMPRE la primera línea: carga el .env antes que todo
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import type { IEmployeeRepository } from './repositories/employee.repository.js';
import { MongoEmployeeRepository } from './repositories/mongo-employee.repository.js';
import { InMemoryEmployeeRepository } from './repositories/in-memory-employee.repository.js';
import { EmployeeController } from './controllers/employee.controller.js';
import { employeeRoutes } from './routes/employee.routes.js';
import { MongoAuthRepository } from './repositories/mongo-auth.repository.js';
import { AuthController } from './controllers/auth.controller.js';
import { authRoutes } from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';

const isProduction = process.env.NODE_ENV === 'production';
const app = express();

app.set('trust proxy', 1); // detrás de Nginx: respeta X-Forwarded-For / X-Forwarded-Proto
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(cors());
app.use(express.json());

// ---- Raíz de composición (Composition Root) ----
let repository: IEmployeeRepository;
if (process.env.DB_DRIVER === 'memory') {
  repository = new InMemoryEmployeeRepository();
  console.log('🧪 [Repository]: usando almacenamiento en memoria');
} else {
  await connectDatabase();
  repository = new MongoEmployeeRepository();
}

const employeeController = new EmployeeController(repository);
const authController = new AuthController(new MongoAuthRepository());

// ---- Health check (evidencia del modo clúster de PM2) ----
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    pid: process.pid,
    instance: process.env.NODE_APP_INSTANCE ?? '0',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// ---- Registro ordenado de módulos ----
app.use('/api/v1', authRoutes(authController));         // público: /api/v1/auth/login
app.use('/api/v1', employeeRoutes(employeeController)); // protegido con JWT

// ---- Frontend Angular (build estático) ----
const currentDir = dirname(fileURLToPath(import.meta.url));
const frontendDist =
  process.env.FRONTEND_DIST ?? resolve(currentDir, '../../frontend/dist/frontend/browser');
const indexFile = ['index.html', 'index.csr.html']
  .map((name) => join(frontendDist, name))
  .find((file) => existsSync(file));

if (indexFile) {
  app.use(express.static(frontendDist, { index: false, maxAge: isProduction ? '1h' : 0 }));
  // Fallback SPA: cualquier GET que no sea /api devuelve el index de Angular
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(indexFile);
    } else {
      next();
    }
  });
  console.log(`🖥️  [Frontend]: sirviendo Angular desde ${frontendDist}`);
} else {
  console.warn('⚠️  [Frontend]: no se encontró el build de Angular; solo se expone la API');
}

// ---- Manejo de errores (siempre al final) ----
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`Servidor escuchando en el puerto ${env.port} (pid ${process.pid})`);
});

// ---- Apagado limpio: pm2 reload/stop envían SIGINT ----
const shutdown = (signal: string): void => {
  console.log(`${signal} recibido: cerrando servidor (pid ${process.pid})...`);
  server.close(() => {
    mongoose
      .disconnect()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));