import 'dotenv/config'; // SIEMPRE la primera línea: carga el .env antes que todo
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
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

const app = express();

app.use(morgan('dev'));
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

// ---- Registro ordenado de módulos ----
app.use('/api/v1', authRoutes(authController));         // público: /api/v1/auth/login
app.use('/api/v1', employeeRoutes(employeeController)); // protegido con JWT

// ---- Manejo de errores (siempre al final) ----
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log('Servidor escuchando en el puerto ' + env.port);
});