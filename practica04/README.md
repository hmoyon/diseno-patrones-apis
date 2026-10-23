# Práctica 4: Optimización de Modelos de Datos con GraphQL y DataLoader

**Asignatura:** Patrones de Diseño de APIs — Maestría en Ingeniería de Software
**Unidad:** 3 — Diseño de APIs

Servidor GraphQL (Apollo Server) que expone un catálogo de clientes con sus facturas. La práctica reproduce el **problema de consulta N+1** y lo resuelve aplicando el patrón **DataLoader** (agrupación por lotes y caché por petición).

| Versión | Consultas a la base por la query del dashboard |
|---|---|
| Ingenua (código original) | **4** (1 + N, con N = 3 clientes) |
| Con DataLoader | **2** (constante, sin importar N) |

---

## Contenido

1. [Requisitos](#1-requisitos)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Instalación](#3-instalación)
4. [Fase 1: Ejecutar la versión ingenua (problema N+1)](#4-fase-1-ejecutar-la-versión-ingenua-problema-n1)
5. [Fase 2: Ejecutar la versión con DataLoader](#5-fase-2-ejecutar-la-versión-con-dataloader)
6. [Demostración lado a lado con ramas de Git](#6-demostración-lado-a-lado-con-ramas-de-git)
7. [Cómo funciona la solución](#7-cómo-funciona-la-solución)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Entrega](#9-entrega)

---

## 1. Requisitos

- **Node.js 18 o superior** (comprobar con `node -v`).
- **npm** (incluido con Node.js).
- **Git** (para la demostración con ramas).
- Un navegador con conexión a internet para usar **Apollo Sandbox** (la interfaz se descarga de Apollo).
- Opcional: **Visual Studio Code**.

## 2. Estructura del proyecto

```
practica04/
└── graphql/
    ├── server.js      # Servidor GraphQL (versión optimizada con DataLoader)
    ├── database.js    # Base de datos simulada extendida (referencia)
    ├── package.json   # Dependencias y "type": "module"
    ├── reporte.txt    # Evidencia: número de consultas antes y después
    ├── README.md      # Enunciado de la práctica
    └── .gitignore     # Excluye node_modules/
```

Dependencias principales:

| Paquete | Uso |
|---|---|
| `@apollo/server` | Servidor GraphQL y Apollo Sandbox |
| `graphql` | Motor de ejecución de GraphQL |
| `dataloader` | Agrupación por lotes y caché por petición |

## 3. Instalación

Abrir una terminal (PowerShell, CMD o la terminal de VS Code) y ejecutar:

```bash
cd C:\diseno-patrones-apis\practica04\graphql
npm install
```

> El proyecto usa módulos ECMAScript (`import`/`export`), por eso `package.json` declara `"type": "module"`.

## 4. Fase 1: Ejecutar la versión ingenua (problema N+1)

La versión original del docente está en la rama `main`. Si aún no se creó la rama de la solución, ver primero la [sección 6.1](#61-crear-la-rama-de-la-solución-una-sola-vez).

1. Cambiar a la versión original e iniciar el servidor:

   ```bash
   git checkout main
   node server.js
   ```

   La terminal muestra:

   ```
   🚀 Servidor listo en Académico listo en: http://localhost:4000/
   ```

2. Abrir **http://localhost:4000/** en el navegador. Se carga **Apollo Sandbox**.

3. Pegar la siguiente query en el panel **Operation** y pulsar **Run**:

   ```graphql
   query GetDashboardData {
     clientes {
       nombre
       sector
       facturas {
         monto
       }
     }
   }
   ```

4. Observar la **terminal** (no el navegador). Aparecen **4 consultas**:

   ```
   [DB READ] SELECT * FROM clientes;
   [DB READ] SELECT * FROM facturas WHERE cliente_id = 'c-1';
   [DB READ] SELECT * FROM facturas WHERE cliente_id = 'c-2';
   [DB READ] SELECT * FROM facturas WHERE cliente_id = 'c-3';
   ```

   El resolver `Cliente.facturas` se ejecuta una vez por cliente y cada ejecución consulta la base por separado: **1 + N consultas**.

5. Detener el servidor con **Ctrl + C**.

## 5. Fase 2: Ejecutar la versión con DataLoader

1. Cambiar a la rama de la solución e iniciar el servidor:

   ```bash
   git checkout dataloader
   node server.js
   ```

   La terminal muestra:

   ```
   🚀 Servidor Académico listo en: http://localhost:4000/
   ```

2. Recargar **http://localhost:4000/** y ejecutar la **misma query** con **Run**.

3. Observar la terminal. Ahora aparecen solo **2 consultas**:

   ```
   [DB READ] SELECT * FROM clientes;
   [DB BATCH READ] SELECT * FROM facturas WHERE cliente_id IN ('c-1', 'c-2', 'c-3');
   ```

4. Pulsar **Run** una segunda vez. Vuelven a imprimirse 2 consultas: cada petición crea su propio DataLoader, por lo que la caché no se comparte entre peticiones.

5. Verificar que la respuesta JSON en Sandbox es **idéntica** a la de la Fase 1.

6. Detener el servidor con **Ctrl + C**.

## 6. Demostración lado a lado con ramas de Git

| Rama | Contenido | Resultado |
|---|---|---|
| `main` | Código original (resolución ingenua) | 4 consultas |
| `dataloader` | Solución con DataLoader + `reporte.txt` | 2 consultas |

### 6.1 Crear la rama de la solución (una sola vez)

**Desde la terminal:**

```bash
cd C:\diseno-patrones-apis\practica04\graphql
git checkout -b dataloader
git add server.js database.js package.json reporte.txt
git commit -m "Implementa DataLoader para resolver el problema N+1"
git branch
```

`git branch` debe mostrar `main` y `* dataloader`.

**Desde Visual Studio Code:**

1. **File → Open Folder** → abrir `practica04\graphql`.
2. Clic en el nombre de la rama (esquina inferior izquierda) → **Create new branch…** → `dataloader`.
3. Panel **Source Control** (`Ctrl + Shift + G`) → **+** junto a *Changes*.
4. Escribir el mensaje del commit y pulsar **Commit**.

> No pulsar **Publish Branch** ni hacer `git push`: el remoto `origin` apunta al repositorio del docente.

### 6.2 Ejecutar la demostración

1. En VS Code, abrir la terminal (**Terminal → New Terminal**).
2. Cambiar a `main` (clic en el nombre de la rama), ejecutar `node server.js`, correr la query y mostrar las **4 consultas**. Detener con **Ctrl + C**.
3. Abrir una segunda terminal con **Split Terminal** para conservar la salida anterior.
4. Cambiar a `dataloader`, ejecutar `node server.js` en la nueva terminal, repetir la query y mostrar las **2 consultas**.
5. Para mostrar el código cambiado: panel **Source Control → Graph** → clic en el commit → clic en `server.js`. Se abre la comparación antes/después.

> Al pasar a `main`, `reporte.txt` desaparece de la carpeta. Es normal: solo existe en la rama `dataloader`.

## 7. Cómo funciona la solución

Todos los cambios están en `server.js`:

1. **Import de DataLoader**

   ```js
   import DataLoader from 'dataloader';
   ```

2. **Método por lotes** en el objeto `db`: recibe todas las llaves, hace una sola consulta `WHERE cliente_id IN (...)` y devuelve las facturas **en el mismo orden y con la misma longitud** que las llaves (contrato de DataLoader). Un cliente sin facturas recibe `[]`.

   ```js
   async fetchFacturasByClienteIdsBatch(clienteIds) {
       // ... una sola consulta para todos los clientes
       return clienteIds.map(id => facturasPorCliente.get(id));
   }
   ```

3. **Fábrica de loaders**

   ```js
   const createLoaders = () => ({
       facturasByClienteId: new DataLoader(
           (clienteIds) => db.fetchFacturasByClienteIdsBatch(clienteIds)
       )
   });
   ```

4. **DataLoader en `context`, una instancia por petición.** Nunca se crea de forma global, para evitar que la caché se comparta entre usuarios.

   ```js
   const { url } = await startStandaloneServer(server, {
       listen: { port: 4000 },
       context: async () => ({ loaders: createLoaders() })
   });
   ```

5. **Resolver actualizado.** Cada llamada solo encola su llave; DataLoader las agrupa y dispara una única consulta.

   ```js
   facturas: (parent, _args, context) =>
       context.loaders.facturasByClienteId.load(parent.id)
   ```

## 8. Solución de problemas

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| `EADDRINUSE: address already in use :::4000` | Otro servidor sigue corriendo | Detenerlo con **Ctrl + C** o cerrar esa terminal |
| `Cannot find package '@apollo/server'` | Faltan dependencias | Ejecutar `npm install` dentro de `graphql` |
| `Cannot use import statement outside a module` | Falta `"type": "module"` | Revisar `package.json` |
| `Cannot read properties of undefined (reading 'facturasByClienteId')` | Falta la opción `context` | Revisar el bloque `startStandaloneServer` |
| No aparecen líneas `[DB ...]` | Solo se abrió la página | Pulsar **Run** en Sandbox; las líneas salen en la terminal |
| Siguen saliendo 4 consultas | Se ejecuta la rama `main` | Detener el servidor y cambiar a `dataloader` |
| No se puede cambiar de rama | Hay cambios sin commit | Hacer el commit (sección 6.1) |
| Sandbox no carga | Sin internet | Probar desde PowerShell (ver abajo) |

Prueba sin Sandbox (PowerShell, con el servidor corriendo):

```powershell
Invoke-RestMethod -Uri http://localhost:4000/ -Method Post -ContentType "application/json" -Body '{"query":"{ clientes { nombre facturas { monto } } }"}' | ConvertTo-Json -Depth 5
```

## Autor

**Héctor Moyón Amaya** — Maestría de Software
Docente: Ing. Patsy Prieto V., MSc.