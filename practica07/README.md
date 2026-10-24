# Práctica 06 · Componente de Seguridad Avanzada (JWT & Autenticación)

Aplicación MEAN (MongoDB, Express, Angular, Node.js) para gestionar empleados, protegida con autenticación por **JSON Web Tokens**. Corresponde a la **Práctica 05 — Seguridad (Confidencialidad y Autenticidad)** de la asignatura *Patrones de Diseño de APIs*, Maestría en Software, Universidad Politécnica Salesiana.

Solo los usuarios autenticados pueden ver, crear, editar o eliminar empleados. El backend firma un JWT al iniciar sesión y lo exige en cada petición; el frontend lo guarda, lo envía de forma automática e impide entrar a `/employees` sin sesión.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Backend | Node.js, Express 5, TypeScript, Mongoose, Zod 4, jsonwebtoken, bcrypt, dotenv |
| Frontend | Angular 17 (módulos + SSR), RxJS, HttpClient con interceptores funcionales |
| Base de datos | MongoDB |

## Requisitos previos

- Node.js 18 o superior
- MongoDB en ejecución en `mongodb://127.0.0.1`
- Angular CLI 17 (`npm install -g @angular/cli`)

## Estructura del proyecto

```
practica07/
├── backend/
│   ├── .env.example
│   └── src/
│       ├── config/          # env.ts (configuración validada) y database.ts
│       ├── controllers/     # employee.controller.ts, auth.controller.ts
│       ├── domain/          # entidades employee.ts y user.ts
│       ├── dtos/            # employee.dto.ts, auth.dto.ts (Zod)
│       ├── errors/          # AppError, NotFound, Unauthorized, Forbidden
│       ├── middlewares/     # auth, validate, error-handler
│       ├── models/          # esquemas de Mongoose
│       ├── repositories/    # interfaces + implementaciones Mongo / memoria
│       ├── routes/          # employee.routes.ts, auth.routes.ts
│       ├── scripts/         # seed-user.ts
│       ├── utils/           # api-response.ts (Response Wrapper)
│       └── index.ts         # raíz de composición
└── frontend/
    └── src/app/
        ├── components/      # employee-page, employee-form, employee-table, login-page, login-form
        ├── guards/          # auth.guard.ts
        ├── interceptors/    # auth.interceptor.ts
        ├── models/          # employee.ts, auth.ts, api-response.ts
        └── services/        # employee.service.ts, auth.service.ts
```

## Instalación y ejecución

### 1. Backend

```bash
cd backend
npm install
```

Crea el archivo `backend/.env` a partir de `.env.example`:

```bash
PORT=3000
MONGO_URI=mongodb://127.0.0.1/usuarios_db
JWT_SECRET=cambia-esto-por-una-frase-larga-y-secreta
JWT_EXPIRES_IN=2h
```

> El servidor no arranca si falta `JWT_SECRET`. El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio.

Crea el usuario de prueba (una sola vez) y levanta el servidor:

```bash
npm run seed:user
npm run dev
```

El seed crea `admin@ups.edu.ec` / `Admin2026` con rol `admin`. Para otro usuario:

```bash
npm run seed:user -- correo@ups.edu.ec MiClave123 alumno
```

La API queda en `http://localhost:3000/api/v1`.

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

Abre `http://localhost:4200` e inicia sesión con el usuario de prueba.

## Endpoints

Todas las respuestas usan el mismo formato (Response Wrapper):

```json
{ "success": true, "message": "...", "data": {}, "errors": [], "timestamp": "..." }
```

| Método | Ruta | Requiere token | Descripción |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | No | Valida credenciales y devuelve `{ token, user }` |
| GET | `/api/v1/employees` | Sí | Lista los empleados |
| GET | `/api/v1/employees/:id` | Sí | Obtiene un empleado |
| POST | `/api/v1/employees` | Sí | Crea un empleado |
| PUT | `/api/v1/employees/:id` | Sí | Actualiza un empleado |
| DELETE | `/api/v1/employees/:id` | Sí | Elimina un empleado |

Las rutas protegidas esperan la cabecera:

```
Authorization: Bearer <token>
```

### Códigos de error

| Código | Cuándo |
| --- | --- |
| 400 | El body no cumple el DTO (detalle en `errors`) |
| 401 | No se envió token, o las credenciales del login son inválidas |
| 403 | El token está vencido o su firma no es válida |
| 404 | Recurso o ruta inexistente |

## Flujo de autenticación

1. El usuario abre `/employees`; el `authGuard` detecta que no hay sesión y lo envía a `/login`.
2. El login envía correo y contraseña a `POST /auth/login`.
3. El backend valida el body con `LoginDto`, busca el usuario y compara la contraseña con `bcrypt.compare`.
4. Si coincide, firma un JWT con `{ id, email, rol }` que vence en 2 horas.
5. `AuthService` guarda el token en `localStorage` y emite el usuario por `currentUser$`.
6. El interceptor agrega `Authorization: Bearer <token>` a cada petición; el middleware `authenticateJWT` lo verifica antes del controlador.
7. Ante un 401 o 403, el interceptor cierra la sesión y devuelve al usuario a `/login`.

## Patrones de diseño aplicados

| Patrón | Dónde |
| --- | --- |
| Repository | `IEmployeeRepository`, `IAuthRepository` y sus implementaciones |
| DTO | `employee.dto.ts`, `auth.dto.ts` (Zod) |
| Middleware / Chain of Responsibility | `authenticateJWT → validate → controller` |
| Response Wrapper | `sendSuccess`, `sendError`, `errorHandler` |
| Composition Root | `backend/src/index.ts` |
| Interceptor | `auth.interceptor.ts` |
| Guard | `auth.guard.ts` (`authGuard`, `guestGuard`) |
| Smart / Dumb components | `employee-page` / `employee-form`, `employee-table`; `login-page` / `login-form` |
| Observable store | `EmployeeService` y `AuthService` con `BehaviorSubject` |

## Seguridad

- Las contraseñas se guardan como hash bcrypt (10 rondas), nunca en texto plano.
- El secreto de firma vive en `.env` y se valida al arrancar.
- El login responde el mismo mensaje si el correo no existe o la contraseña es incorrecta, para no revelar qué cuentas existen.
- Las cinco rutas de empleados exigen token, de modo que la API está protegida aunque se use sin el frontend.
- El JWT está firmado, no cifrado: su contenido es legible, por eso solo incluye id, correo y rol.

## Pruebas rápidas

| Prueba | Resultado esperado |
| --- | --- |
| Login con `admin@ups.edu.ec` / `Admin2026` | 200 con token |
| Login con contraseña incorrecta | 401 |
| Login con `{"email":"abc","password":"123"}` | 400 con `errors` |
| `GET /employees` sin token | 401 |
| `GET /employees` con token alterado | 403 |
| `GET /employees` con token válido | 200 |
| Abrir `/employees` en el navegador sin sesión | Redirige a `/login` |



## Autor

**Héctor Moyón Amaya** — Maestría de Software

Docente: Ing. Patsy Prieto V., MSc.
