# Práctica 6 — Evaluación de Atributos de Calidad (ISO/IEC 25010) mediante Testing

**Maestría de Software · Patrones de Diseño de APIs**
Docente: Ing. Patsy Prieto, MSc.

Evaluación empírica de la calidad de la **API de Gestión de Empleados** (Stack MEAN, refactorizada en la Práctica 3 con Patrón Repository, DTO con Zod y Response Wrapper), mediante:

- **Pruebas unitarias aisladas con Jest** → *Mantenibilidad: modularidad y capacidad de prueba*.
- **Pruebas de estrés concurrente con Artillery** → *Eficiencia de desempeño: comportamiento temporal y capacidad*.

La prueba de carga se ejecutó en dos escenarios de persistencia: **MongoDB local** y **MongoDB Atlas**.

---

## Tabla de contenidos

- [Objetivos](#objetivos)
- [Tecnologías](#tecnologías)
- [Arquitectura bajo prueba](#arquitectura-bajo-prueba)
- [Estructura de archivos de la práctica](#estructura-de-archivos-de-la-práctica)
- [Instalación](#instalación)
- [Fase A — Pruebas unitarias aisladas (Jest)](#fase-a--pruebas-unitarias-aisladas-jest)
- [Fase B — Pruebas de estrés concurrente (Artillery)](#fase-b--pruebas-de-estrés-concurrente-artillery)
- [Ejecución contra MongoDB local o MongoDB Atlas](#ejecución-contra-mongodb-local-o-mongodb-atlas)
- [Resultados](#resultados)
- [Análisis](#análisis)
# - [Evaluación ISO/IEC 25010](#evaluación-isoiec-25010)
- [Conclusiones](#conclusiones)
- [Recomendaciones](#recomendaciones)
- [Solución de problemas](#solución-de-problemas)

---

## Objetivos

1. **Validar la modularidad y la capacidad de prueba.** Demostrar el éxito del desacoplamiento arquitectónico (Patrón Repository) aislando por completo el controlador HTTP mediante dobles de prueba (*mocks*).
2. **Auditar el comportamiento temporal y la capacidad.** Evaluar la resiliencia de las reglas contractuales (Zod DTO) e identificar la degradación del rendimiento ante saturación transaccional incremental y concurrente.

---

## Tecnologías

| Herramienta | Uso |
|---|---|
| Node.js (v20+) · TypeScript · Express 5 | Runtime y API bajo prueba |
| Mongoose · MongoDB local / MongoDB Atlas (M0) | Persistencia |
| Zod | Validación perimetral (DTO) |
| **Jest + ts-jest** (preset ESM) · `@jest/globals` | Pruebas unitarias |
| **Artillery** + plugin `ensure` | Pruebas de estrés y verificación de SLA |

---

## Arquitectura bajo prueba

```mermaid
flowchart LR
  subgraph FaseA["Fase A · Jest (sin base de datos)"]
    T["employee.controller.spec.ts"] --> C1["EmployeeController"]
    C1 --> M["Mock de IEmployeeRepository<br/>(jest.fn)"]
  end

  subgraph FaseB["Fase B · Artillery (tubería completa)"]
    A["stress-test.yml"] -->|HTTP POST| R["Routes"]
    R --> V["validate() · Zod DTO"]
    V -->|válido| C2["EmployeeController"] --> I["IEmployeeRepository"] --> MR["MongoEmployeeRepository"] --> DB[("MongoDB local<br/>o Atlas")]
    V -->|inválido| E["errorHandler → 400"]
  end
```

La clave de la Fase A es que el controlador depende de la **abstracción** `IEmployeeRepository`, no de Mongoose. En la prueba se le inyecta un mock, y la base de datos nunca se carga.

---

## Estructura de archivos de la práctica

Archivos **agregados** al backend de la Práctica 3. No se modificó ningún archivo de `src` salvo `config/database.ts`, para soportar Atlas.

```
backend/
├── jest.config.js                              ← configuración de Jest (ESM)
├── stress-test.yml                             ← escenario de Artillery
├── package.json                                ← scripts test / test:coverage / stress
└── src/
    ├── config/
    │   └── database.ts                         ← lee MONGO_URI (local o Atlas)
    ├── controllers/
    │   └── employee.controller.spec.ts         ← prueba unitaria del controlador (mock)
    ├── dtos/
    │   └── employee.dto.spec.ts                ← pruebas de las reglas Zod
    └── middlewares/
        └── validate.middleware.spec.ts         ← prueba del rechazo perimetral
```

---

## Instalación

Desde la carpeta `backend/`:

```bash
# Dependencias de pruebas unitarias
npm install jest @types/jest ts-jest -D

# Artillery (global)
npm install -g artillery
artillery version
```

### `jest.config.js`

Como el proyecto usa `"type": "module"`, Jest se configura con soporte nativo de ES Modules:

```js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  // Los imports del proyecto terminan en .js (NodeNext); Jest debe resolver el .ts
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
```

### Scripts en `package.json`

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage",
  "stress": "artillery run stress-test.yml --output stress-report.json"
}
```

> El flag `--experimental-vm-modules` es obligatorio para ejecutar Jest con ES Modules.

---

## Fase A — Pruebas unitarias aisladas (Jest)

**Atributo:** Mantenibilidad → modularidad y capacidad de prueba.
**Regla de la guía:** si el archivo de prueba importa `mongoose`, la práctica se penaliza.

### Prueba del controlador (`employee.controller.spec.ts`)

Se construye un mock 100% aislado de la interfaz y se inyecta por constructor:

```ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { EmployeeController } from './employee.controller.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';

beforeEach(() => {
  // 1. Mock 100% aislado de la interfaz (cero dependencia de Mongoose)
  mockRepository = {
    findAll: jest.fn<IEmployeeRepository['findAll']>(),
    findById: jest.fn<IEmployeeRepository['findById']>(),
    create: jest.fn<IEmployeeRepository['create']>(),
    update: jest.fn<IEmployeeRepository['update']>(),
    delete: jest.fn<IEmployeeRepository['delete']>(),
  };
  // 2. Inyección de dependencias
  controller = new EmployeeController(mockRepository);
  // 3. Mock de res.status(...).json(...)
  jsonMock = jest.fn();
  statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  mockResponse = { status: statusMock as unknown as Response['status'] };
});

it('Debería retornar 200 y la lista de empleados obtenida de la abstracción', async () => {
  mockRepository.findAll.mockResolvedValue([fakeEmployee]);

  await controller.getAll({} as Request, mockResponse as Response);

  expect(statusMock).toHaveBeenCalledWith(200);
  expect(jsonMock).toHaveBeenCalledWith(
    expect.objectContaining({ success: true, data: [fakeEmployee] })
  );
  expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
});
```

> En modo ESM el objeto `jest` **no es global**: se importa desde `@jest/globals`.

| # | Escenario del controlador | Resultado esperado |
|---|---|---|
| 1 | Listar empleados | `status(200)` + Response Wrapper con la lista; `findAll` llamado 1 vez |
| 2 | Consultar por ID existente | `status(200)` con el empleado |
| 3 | Consultar por ID inexistente | Lanza `NotFoundError` (404); no escribe respuesta |
| 4 | Crear empleado | `status(201)`; `create` recibe el body |
| 5 | Actualizar empleado | `status(200)` con los datos actualizados |
| 6 | Eliminar empleado | `status(200)` con `data: null` |
| 7 | Error de persistencia | El error se propaga al interceptor global |

### Pruebas de la validación perimetral

- **`employee.dto.spec.ts`:** payload válido (con `trim`), payload corrupto del escenario de estrés, sueldo `0`, tipos incorrectos, claves no declaradas, actualización vacía y formato de ID. Incluye casos parametrizados de **sueldo negativo**:
  ```ts
  it.each([-1, -0.01, -500, -4200, -999999])('Rechaza sueldo negativo en la creación (%p)', (sueldo) => {
    const result = CreateEmployeeDto.safeParse({ nombre: 'Carlos Pérez', cargo: 'Analista', departamento: 'TI', sueldo });
    expect(result.success).toBe(false);
  });
  ```
- **`validate.middleware.spec.ts`:** demuestra que, con datos inválidos, el middleware lanza `ZodError` y **`next()` nunca se invoca**, es decir, el controlador no se ejecuta:
  ```ts
  expect(() => middleware(req, {} as Response, next)).toThrow(ZodError);
  expect(next).not.toHaveBeenCalled();
  ```

### Ejecución

```bash
npm run test
```

Verificación de aislamiento:

```powershell
# 1. Las pruebas pasan con MongoDB detenido (PowerShell como administrador)
net stop MongoDB
npm run test
net start MongoDB

# 2. Ningún archivo de prueba importa Mongoose (no debe devolver nada)
Select-String -Path .\src\**\*.spec.ts -Pattern "from 'mongoose'"
```

### Pregunta de control

**¿Por qué la Inversión de Dependencias permite probar el controlador sin un contenedor Docker ni una instancia de MongoDB?**

Porque `EmployeeController` no depende de Mongoose sino de la abstracción `IEmployeeRepository`, que recibe por constructor. En producción, la raíz de composición (`index.ts`) inyecta `MongoEmployeeRepository`. En la prueba se inyecta un doble cuyo comportamiento se programa con `mockResolvedValue`. El grafo de dependencias de la prueba nunca carga Mongoose ni abre conexiones: se valida solo la lógica del controlador (códigos HTTP, contrato del Response Wrapper y delegación), de forma determinista y en milisegundos.

---

## Fase B — Pruebas de estrés concurrente (Artillery)

**Atributo:** Eficiencia de desempeño → comportamiento temporal y capacidad.

### Escenario (`stress-test.yml`)

```yaml
config:
  target: "http://localhost:3000"
  plugins:
    ensure: {}
  ensure:
    thresholds:
      - "http.response_time.p99": 200   # SLA: 99% de las transacciones en < 200 ms
    maxErrorRate: 1                     # máximo 1% de errores
  phases:
    - duration: 20
      arrivalRate: 5
      name: "1. Fase de Calentamiento (Tráfico Base)"
    - duration: 30
      arrivalRate: 15
      rampTo: 50
      name: "2. Fase de Saturación Máxima (Pico de Carga)"

scenarios:
  - name: "Inundación transaccional perimetral (Payloads Mixtos Zod)"
    flow:
      # Flujo A: datos correctos → tubería completa hasta MongoDB
      - post:
          url: "/api/v1/employees"
          json: { nombre: "Andrés Mendoza", cargo: "Software Architect", departamento: "I+D", sueldo: 4200 }
          capture:
            json: "$.data.id"           # el repositorio devuelve "id" (no "_id")
            as: "employeeId"
      - think: 1
      # Flujo B: datos corruptos → rechazo inmediato del DTO Zod (400)
      - post:
          url: "/api/v1/employees"
          json: { nombre: "Al", cargo: "Dev", departamento: "TI", sueldo: -500 }
```

**Volumen generado:** unos 1 075 usuarios virtuales, cada uno con 1 POST válido y 1 POST corrupto, para un total de **2 150 peticiones**.

### Ejecución

```bash
# Terminal 1: backend
npm run dev

# Terminal 2: prueba de carga
npm run stress
```

**Limpieza posterior.** La prueba crea unos 1 075 registros:

```bash
mongosh "mongodb://127.0.0.1:27017/usuarios_db" --eval 'db.empleados.deleteMany({ cargo: "Software Architect" })'
```

---

## Ejecución contra MongoDB local o MongoDB Atlas

`src/config/database.ts` lee la cadena de conexión de la variable de entorno `MONGO_URI`. Si no existe, usa MongoDB local:

```ts
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
```

```powershell
# MongoDB Atlas (la variable vive solo en esta terminal)
$env:MONGO_URI="mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/usuarios_db?retryWrites=true&w=majority&appName=Cluster0"
npm run dev
# → Conexión exitosa a MongoDB Atlas (nube) · Servidor = ...mongodb.net

# Volver a MongoDB local
Remove-Item Env:MONGO_URI
npm run dev
# → Conexión exitosa a MongoDB local · Servidor = 127.0.0.1
```

> ⚠️ **Nunca subas la cadena de conexión de Atlas al repositorio.** Contiene la contraseña.

---

## Resultados

### Fase A
- La suite de Jest finaliza **en verde**, también con MongoDB detenido.
- Ningún archivo `*.spec.ts` importa Mongoose.

### Fase B: métricas de Artillery

| Métrica | Local Ej. 1 | Local Ej. 2 | Local Ej. 3 | **Atlas** |
|---|---:|---:|---:|---:|
| Usuarios virtuales creados / fallidos | 1 075 / 0 | 1 075 / 0 | 1 075 / 0 | 1 075 / 0 |
| Peticiones HTTP | 2 150 | 2 150 | 2 150 | 2 150 |
| `http.codes.201` | 1 075 | 1 075 | 1 075 | 1 075 |
| `http.codes.400` | 1 075 | 1 075 | 1 075 | 1 075 |
| p99 global (ms) | 156,0 | 141,2 | 68,7 | **252,2** |
| p50 flujo válido 2xx (ms) | 2 | 2 | 2 | **149,9** |
| p99 flujo válido 2xx (ms) | **228,2** | 165,7 | 87,4 | **284,3** |
| p50 / p99 rechazo 4xx (ms) | 1 / 66,0 | 1 / 111,1 | 1 / 58,6 | 1 / 74,4 |
| Máximo (ms) | 446 | 245 | 193 | 1 096 |
| **SLA p99 ≤ 200 ms** | ✅ | ✅ | ✅ | ❌ |

*Fuente: `stress-report.json` de cada ejecución. En negrita, los valores por encima del SLA.*

---

## Análisis

### `http.codes.201` vs `http.codes.400`
En las cuatro ejecuciones, **201 = 400 = 1 075** y no hubo ningún usuario virtual fallido. Como cada usuario envió exactamente un payload válido y uno corrupto, el contador de rechazos coincide **de forma exacta** con el tráfico ilegal inyectado: **Zod rechazó el 100% de las peticiones corruptas** antes de que llegaran al controlador o a la base de datos.

### Percentil 99 en entorno local
- Se cumple el SLA en las tres ejecuciones, pero **la mediana se mantiene en 2 ms mientras el p99 crece**: la degradación está en la cola.
- En la ejecución 1, el p99 pasó de **26 ms (63 req/s) a 242 ms (86 req/s)**, unas 9 veces más ante solo un 37% más de carga. Es un crecimiento **no lineal, de tipo exponencial**, que marca el punto de saturación.
- **Cuellos de botella síncronos en el Event Loop:**
  - logging de `morgan` a consola (síncrono en Windows),
  - `JSON.parse` en `express.json()`,
  - `parse` de Zod,
  - construcción, validación y serialización BSON de Mongoose,
  - pausas del recolector de basura (GC) de V8.
- **Evidencia del bloqueo compartido:** el p99 de los rechazos 400 subió hasta 102,5 ms en el pico, aunque validar con Zod cuesta ~1 ms. Los rechazos esperaban turno en el mismo Event Loop (*head-of-line blocking*).

### Local vs Atlas
- La escritura más rápida en Atlas tardó **139 ms** y la mediana **149,9 ms**, frente a ~2 ms en local. Ese piso es el **tiempo de ida y vuelta de red** hasta el clúster.
- El p99 global (**252,2 ms**) y el del flujo válido (**284,3 ms**) **superan el SLA**.
- Los rechazos de Zod mantienen **1 ms de mediana en ambos entornos**, porque nunca tocan la base. Con una base remota, la validación perimetral ahorra un viaje de red por cada petición inválida.
- Los valores atípicos de ~1 s (p99.9 = 1 064 ms) se atribuyen probablemente a la apertura de conexiones del pool hacia Atlas (handshake TLS) o a la limitación de operaciones del plan M0.
- En Atlas la mediana global (120 ms) no es representativa, porque mezcla rechazos de ~1 ms y escrituras de ~150 ms. Se analiza 2xx y 4xx por separado.

---

## Evaluación ISO/IEC 25010

| Característica | Subcaracterística | Evidencia | Resultado |
|---|---|---|---|
| Mantenibilidad | Modularidad, capacidad de prueba | Suite Jest con mocks, aprobada sin MongoDB | ✅ Cumple |
| Seguridad | Integridad | 400 = 100% del tráfico corrupto | ✅ Cumple |
| Fiabilidad | Madurez, tolerancia a fallos | 0 usuarios virtuales fallidos | ✅ Cumple |
| Eficiencia de desempeño | Comportamiento temporal | p99 local 68,7–156 ms · Atlas 252,2 ms | ✅ Local · ❌ Atlas |
| Eficiencia de desempeño | Capacidad | Degradación no lineal desde ~86 req/s | ⚠️ Umbral identificado |
| Eficiencia de desempeño | Utilización de recursos | Rechazo Zod ~1 ms sin consumir la BD | ✅ Cumple |

---

## Conclusiones

1. La **Inversión de Dependencias** permitió probar el controlador de forma totalmente aislada y sin infraestructura, lo que confirma la mantenibilidad lograda con el Patrón Repository.
2. La **validación perimetral con Zod** rechazó el 100% del tráfico corrupto de forma reproducible, con un costo de ~1 ms e independiente de la base de datos.
3. En **local**, la API cumple el SLA, pero la latencia de cola crece de forma no lineal cerca de 86 req/s por el trabajo síncrono del Event Loop.
4. Con **MongoDB Atlas**, la latencia de red domina las escrituras e incumple el SLA. Medir solo en local no basta para estimar el comportamiento en producción.
5. La variabilidad entre ejecuciones idénticas (coeficiente de variación del p99 ≈ 38%) indica que las pruebas de rendimiento deben repetirse y reportarse con su dispersión.

---

## Recomendaciones

- Desactivar o volver asíncrono el logging (`morgan`) en producción.
- Ubicar la API y el clúster de Atlas en la misma región, cercana a los usuarios.
- Configurar y precalentar el pool de conexiones de Mongoose (`maxPoolSize`).
- Agregar *rate limiting* ante ráfagas de tráfico.
- Integrar Jest y Artillery en un pipeline de CI, con el SLA como criterio de aceptación.

---

## Solución de problemas

| Problema | Solución |
|---|---|
| `ReferenceError: jest is not defined` | En ESM, importa `jest` desde `@jest/globals` |
| `Cannot use import statement outside a module` | Ejecuta con `npm run test` (incluye `--experimental-vm-modules`) |
| Jest no encuentra `./employee.controller.js` | Verifica el `moduleNameMapper` en `jest.config.js` |
| La prueba "contra Atlas" muestra p50 ≈ 2 ms | La API sigue en local: revisa que la consola muestre «MongoDB Atlas (nube)» y que `MONGO_URI` esté definida **en la misma terminal** |
| Artillery le pega a un backend antiguo | `Get-NetTCPConnection -LocalPort 3000 -State Listen` y termina el proceso sobrante |
| `ensure` marca *fail* | No es un error de la prueba: indica que se superó el SLA y debe analizarse |

---

## Autor

**[Héctor Moyón Amaya]** — Maestría de Software · Patrones de Diseño de APIs
