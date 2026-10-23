import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDatabase } from './config/database.js';
import type { IEmployeeRepository } from './repositories/employee.repository.js';
import { MongoEmployeeRepository } from './repositories/mongo-employee.repository.js';
import { InMemoryEmployeeRepository } from './repositories/in-memory-employee.repository.js';
import { EmployeeController } from './controllers/employee.controller.js';
import { employeeRoutes } from './routes/employee.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// ---- Raíz de composición (Composition Root) ----
// Único punto donde se decide qué implementación de persistencia se usa.
// DB_DRIVER=memory  -> repositorio en memoria (sin MongoDB)
// por defecto       -> MongoDB
let repository: IEmployeeRepository;
if (process.env.DB_DRIVER === 'memory') {
  repository = new InMemoryEmployeeRepository();
  console.log('🧪 [Repository]: usando almacenamiento en memoria');
} else {
  await connectDatabase();
  repository = new MongoEmployeeRepository();
}

const employeeController = new EmployeeController(repository);
app.use('/api/v1', employeeRoutes(employeeController));

// ---- Manejo de errores (siempre al final) ----
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log('Servidor escuchando en el puerto ' + port);
});
