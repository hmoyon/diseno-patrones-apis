# Práctica 08 · Despliegue de Aplicaciones Node.js en Producción con AWS, Nginx y PM2

Aplicación MEAN de gestión de empleados (backend **Express + TypeScript**, frontend **Angular 17**, **MongoDB Atlas**) desplegada en producción sobre **AWS EC2**, con **Nginx** como proxy inverso HTTPS, **PM2** en modo clúster, despliegue continuo con **PM2 Deploy + GitHub** y alertas en **Slack**.

> Maestría en Software · Universidad Politécnica Salesiana · *Patrones de Diseño de APIs* · Período sept. 2026 – feb. 2027

---

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Tecnologías](#2-tecnologías)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Requisitos previos](#4-requisitos-previos)
5. [Preparación del código](#5-preparación-del-código)
6. [Fase 1 · Red en AWS](#6-fase-1--red-en-aws)
7. [Fase 2 · Servidor, certificado y Nginx](#7-fase-2--servidor-certificado-y-nginx)
8. [Fase 3 · Vinculación EC2 ↔ GitHub](#8-fase-3--vinculación-ec2--github)
9. [Fase 4 · PM2, MongoDB Atlas y secretos](#9-fase-4--pm2-mongodb-atlas-y-secretos)
10. [Fase 5 · Despliegue automatizado (CI/CD)](#10-fase-5--despliegue-automatizado-cicd)
11. [Fase 6 · Alertas en Slack y rotación de logs](#11-fase-6--alertas-en-slack-y-rotación-de-logs)
12. [Pruebas de verificación](#12-pruebas-de-verificación)
13. [Operación diaria](#13-operación-diaria)
14. [Solución de problemas](#14-solución-de-problemas)
15. [Seguridad](#15-seguridad)
16. [Referencias](#16-referencias)

---

## 1. Arquitectura

```
                 ┌──────────────────────── AWS EC2 · Ubuntu · IP elástica 18.221.214.90 ───────────────────────┐
                 │  Security Group: 80 y 443 abiertos · 22 solo Mi IP · 3000 cerrado                          │
 Navegador ──────┼─► Nginx :80 ──301──► Nginx :443 (TLS autofirmado) ──proxy_pass──► localhost:3000            │
 https://IP      │                                                                     │                       │
                 │                                          PM2 cluster "empleados-app" (1 proceso por vCPU)   │
                 │                                          Express: /api/v1 + Angular estático               │──► MongoDB Atlas
                 │                                          módulos: pm2-slack · pm2-logrotate                 │──► Slack #alertas-servidor
                 │   /var/www/empleados/shared/.env  (secretos, fuera de Git)                                 │
                 └────────────────────────────────────────────────────────────────────────────────────────────┘
 Tu PC (Git Bash) ── git push ──► GitHub ◄── git fetch (deploy key) ── EC2
 Tu PC (Git Bash) ── pm2 deploy production (SSH + .pem) ──► EC2
```

- Solo **Nginx** recibe tráfico público. El puerto **3000** de Node.js nunca se expone.
- Express sirve la **API** y el **build de Angular** desde el mismo origen, así que no hace falta configurar CORS en producción.
- Los **secretos** viven únicamente en el servidor, en `shared/.env`.

## 2. Tecnologías

| Capa | Tecnología |
| --- | --- |
| Infraestructura | AWS EC2 (Ubuntu 24.04), Security Group, IP elástica |
| Proxy / TLS | Nginx 1.28, certificado autofirmado OpenSSL (TLS 1.2/1.3) |
| Runtime | Node.js LTS (NodeSource) |
| Procesos | PM2 (cluster mode), `pm2-slack`, `pm2-logrotate` |
| Backend | Express 5, TypeScript, Mongoose, Zod, JWT, bcrypt |
| Frontend | Angular 17 (build estático, configuración `aws`) |
| Base de datos | MongoDB Atlas (M0) |
| CI/CD | GitHub + `pm2 deploy` |
| Alertas | Slack Incoming Webhooks |

## 3. Estructura del repositorio

El repositorio es el de la asignatura; esta práctica vive en la subcarpeta `practica08` de la rama `diseno-patrones-apis`.

```
diseno-patrones-apis/                 ← raíz del repo (git add / commit / push)
├── practica03/ … practica07/
└── practica08/                       ← aquí se ejecuta pm2 deploy
    ├── .gitignore
    ├── ecosystem.config.js           ← configuración de PM2 (procesos + deploy)
    ├── README.md
    ├── backend/
    │   ├── .env.example              ← plantilla (sí se versiona)
    │   ├── package.json · tsconfig.json
    │   └── src/  (config, controllers, dtos, middlewares, models, repositories, routes, scripts, index.ts)
    └── frontend/
        ├── angular.json · package.json
        └── src/  (app, environments)
```

Estructura que crea PM2 en el servidor:

```
/var/www/empleados/
├── current -> source           ← versión desplegada
├── source/                      ← repo clonado (practica03 … practica08)
└── shared/
    ├── .env                     ← secretos (chmod 600)
    └── logs/  (out.log, err.log y rotados .gz)
```

## 4. Requisitos previos

| Cuenta / herramienta | Para qué |
| --- | --- |
| AWS + instancia EC2 Ubuntu 22.04/24.04 y su llave `.pem` | Servidor de producción |
| GitHub | Origen del código |
| MongoDB Atlas | Base de datos administrada |
| Slack (workspace + canal `#alertas-servidor`) | Alertas |
| En tu PC: Node.js LTS, Git, **Git Bash**, PM2 (`npm i -g pm2`) | Compilar, subir y desplegar |

> Todos los comandos *PC* se ejecutan en **Git Bash**, no en PowerShell: `pm2 deploy` ejecuta scripts de shell.

## 5. Preparación del código

| Archivo | Cambio |
| --- | --- |
| `.gitignore` | Ignora `node_modules/`, `.env`, `backend/dist/`, `frontend/dist/`, `frontend/.angular/`, `logs/`, `*.pem` |
| `backend/tsconfig.json` | `rootDir: ./src`, `outDir: ./dist`, `types: ["node"]` |
| `backend/package.json` | Scripts `build` (`tsc`), `start`, `seed:user:prod` |
| `backend/.env.example` | Plantilla de variables sin valores reales |
| `backend/src/index.ts` | `trust proxy`, `GET /api/v1/health` (devuelve el PID), sirve Angular con fallback SPA y apagado limpio (SIGINT/SIGTERM) |
| `frontend/src/environments/environment.prod.ts` | `apiUrl: '/api/v1'` (mismo origen) |
| `frontend/angular.json` | Configuración `aws`: `ssr: false`, `prerender: false` |
| `frontend/package.json` | Script `build:aws`: `ng build --configuration production,aws` |
| `ecosystem.config.js` | Clúster PM2 + despliegue (ver abajo) |

### 5.1 Scripts del backend (`backend/package.json`)

```json
"main": "dist/index.js",
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/index.js",
  "seed:user": "tsx src/scripts/seed-user.ts",
  "seed:user:prod": "node dist/scripts/seed-user.js"
}
```

### 5.2 Configuración `aws` de Angular (`frontend/angular.json`)

Dentro de `projects.frontend.architect.build.configurations`, al mismo nivel que `production` y `development`:

```json
"aws": {
  "ssr": false,
  "prerender": false
}
```

### 5.3 Ecosistema de PM2 (`practica08/ecosystem.config.js`)

```js
const APP_DIR = '/var/www/empleados';

module.exports = {
  apps: [
    {
      name: 'empleados-app',
      cwd: './backend',              // dotenv lee backend/.env (enlace a shared/.env)
      script: 'dist/index.js',
      instances: 'max',              // modo clúster: un proceso por vCPU
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', PORT: 3000 },   // solo variables NO secretas
      error_file: `${APP_DIR}/shared/logs/err.log`,
      out_file: `${APP_DIR}/shared/logs/out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['18.221.214.90'],
      ref: 'origin/diseno-patrones-apis',
      repo: 'git@github.com:hmoyon/diseno-patrones-apis.git',
      path: APP_DIR,
      ssh_options: ['IdentityFile=~/.ssh/practica08-aws.pem', 'StrictHostKeyChecking=accept-new'],
      'pre-setup': `mkdir -p ${APP_DIR}/shared/logs`,
      // Se ejecuta en la raíz del repo clonado: primero entra a practica08/
      'post-deploy': [
        'cd practica08',
        `ln -sfn ${APP_DIR}/shared/.env backend/.env`,
        'cd backend && npm ci && npm run build && cd ..',
        'cd frontend && npm ci && npm run build:aws && cd ..',
        'pm2 reload ecosystem.config.js --env production --update-env',
        'pm2 save',
      ].join(' && '),
    },
  },
};
```

### 5.4 Compilar, probar y subir (PC)

```bash
# Backend
cd /c/diseno-patrones-apis/practica08/backend
npm install && npm run build && ls dist

# Frontend
cd /c/diseno-patrones-apis/practica08/frontend
npm install && npm run build:aws && ls dist/frontend/browser

# Prueba local → http://localhost:3000 y http://localhost:3000/api/v1/health
cd /c/diseno-patrones-apis/practica08/backend
npm start

# Subir solo practica08 (desde la raíz del repo)
cd /c/diseno-patrones-apis
git status                     # NO deben aparecer node_modules, dist ni .env
git add practica08
git commit -m "feat(practica08): preparar despliegue en AWS con PM2 y Nginx"
git push origin diseno-patrones-apis
```

---

## 6. Fase 1 · Red en AWS

### 6.1 Security Group (consola AWS)

**EC2 → Instancias → Seguridad → Editar reglas de entrada**

| Tipo | Puerto | Origen |
| --- | --- | --- |
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |
| SSH | 22 | Mi IP |

> El puerto **3000 no se abre**.

### 6.2 IP elástica

**EC2 → Red y seguridad → IP elásticas → Asignar la dirección IP elástica → Asignar**, y luego en la IP **Asociar dirección IP elástica** → *Instancia* → tu instancia → **Asociar**.

IP asignada: **`18.221.214.90`**

### 6.3 Llave y primera conexión (PC)

```powershell
# PowerShell: proteger la llave
icacls "$env:USERPROFILE\.ssh\practica08-aws.pem" /inheritance:r
icacls "$env:USERPROFILE\.ssh\practica08-aws.pem" /grant:r "$($env:USERNAME):(R)"
```

```bash
# Git Bash
ssh -i ~/.ssh/practica08-aws.pem ubuntu@18.221.214.90
```

## 7. Fase 2 · Servidor, certificado y Nginx

Todos los comandos de esta fase se ejecutan en el **EC2**.

### 7.1 Node.js, Git y herramientas de compilación

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential
node -v && npm -v
```

> No ejecutar `sudo apt install npm`: npm ya viene con el paquete `nodejs` de NodeSource.

### 7.2 Swap de 2 GB (necesario para compilar Angular en 1 GB de RAM)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 7.3 Certificado autofirmado

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

En **Common Name** se ingresa la IP elástica `18.221.214.90`. Verificación:

```bash
sudo openssl x509 -in /etc/ssl/certs/nginx-selfsigned.crt -noout -subject -dates
```

### 7.4 Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl status nginx --no-pager      # active (running)
```

`http://18.221.214.90` → *Welcome to nginx!*

### 7.5 Redirección HTTP → HTTPS y proxy inverso

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

sudo tee /etc/nginx/sites-available/default > /dev/null <<'EOF'
# 1. REDIRECCION DE HTTP A HTTPS USANDO LA IP
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

# 2. SERVIDOR SEGURO (HTTPS)
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;

    ssl_certificate     /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t && sudo systemctl restart nginx
sudo ss -tlnp | grep nginx                   # puertos :80 y :443
curl -kI https://localhost                   # 502 hasta desplegar la app
```

Resultado esperado: `http://18.221.214.90` redirige a `https://18.221.214.90` → aviso de certificado ("No seguro", es esperado) → **502 Bad Gateway** hasta la Fase 5.

## 8. Fase 3 · Vinculación EC2 ↔ GitHub

```bash
# EC2: llave del servidor
ssh-keygen -t ed25519 -C "servidor-produccion"      # Enter x3
cat ~/.ssh/id_ed25519.pub                           # copiar la línea completa
```

GitHub → `hmoyon/diseno-patrones-apis` → **Settings → Deploy keys → Add deploy key** (sin *Allow write access*).

```bash
# EC2: validar y preparar carpeta
ssh -T git@github.com                               # Hi hmoyon/diseno-patrones-apis! ...
sudo mkdir -p /var/www/empleados
sudo chown -R ubuntu:ubuntu /var/www/empleados

# Clon de prueba (solo practica08) y limpieza
cd ~
git clone --filter=blob:none --sparse -b diseno-patrones-apis git@github.com:hmoyon/diseno-patrones-apis.git prueba-clone
cd prueba-clone && git sparse-checkout set practica08 && cd ~
ls prueba-clone && rm -rf prueba-clone
```

## 9. Fase 4 · PM2, MongoDB Atlas y secretos

### 9.1 PM2 en el servidor (EC2)

```bash
sudo npm install -g pm2
pm2 startup systemd          # ejecutar la línea "sudo env PATH=..." que imprime
```

### 9.2 MongoDB Atlas (navegador)

1. **Database Access** → usuario `empleados_app`, contraseña alfanumérica, rol *Read and write to any database*.
2. **Network Access** → `18.221.214.90/32` (estado *Active*).
3. **Connect → Drivers** → copiar la URI y agregar la base `empleados_db` antes del `?`.

### 9.3 Secretos en el servidor (EC2)

```bash
mkdir -p /var/www/empleados/shared/logs
openssl rand -hex 32                         # valor para JWT_SECRET
nano /var/www/empleados/shared/.env
```

```dotenv
MONGO_URI=mongodb+srv://empleados_app:<CLAVE>@<cluster>.mongodb.net/empleados_db?retryWrites=true&w=majority
JWT_SECRET=<resultado de openssl rand -hex 32>
JWT_EXPIRES_IN=2h
```

```bash
chmod 600 /var/www/empleados/shared/.env
```

> `NODE_ENV` y `PORT` están en el ecosistema (no son secretos). Este archivo **nunca** se sube a GitHub.

### 9.4 Probar la conexión a Atlas sin desplegar (EC2)

```bash
cd /var/www/empleados/current/practica08/backend
node -e "require('dotenv').config(); require('mongoose').connect(process.env.MONGO_URI, {serverSelectionTimeoutMS: 8000}).then(c => { console.log('OK - base:', c.connection.name); process.exit(0) }).catch(e => { console.error('ERROR:', e.message); process.exit(1) })"
```

## 10. Fase 5 · Despliegue automatizado (CI/CD)

### 10.1 Preparar la estructura (PC, una sola vez)

```bash
cd /c/diseno-patrones-apis/practica08
pm2 deploy production setup
```

Salida esperada: `cloning git@github.com:hmoyon/diseno-patrones-apis.git` → `setup complete` → `--> Success`.

### 10.2 Desplegar (PC)

```bash
cd /c/diseno-patrones-apis
git status                                      # working tree clean
git log origin/diseno-patrones-apis -1 --oneline

cd practica08
pm2 deploy production
```

Secuencia: `fetching updates` → `resetting HEAD to origin/diseno-patrones-apis` → `executing post-deploy` (`npm ci`, `tsc`, `ng build`) → `[PM2] App [empleados-app] launched` → `--> Success`.

### 10.3 Usuario inicial y verificación (EC2)

```bash
cd /var/www/empleados/current/practica08/backend
npm run seed:user:prod -- admin@ups.edu.ec '<CLAVE>' admin

pm2 list                                        # empleados-app · cluster · online
curl -s localhost:3000/api/v1/health            # repetir: el pid cambia entre instancias
curl -sk https://localhost/api/v1/health        # a través de Nginx + TLS
pm2 logs empleados-app --lines 20 --nostream    # "Conexión exitosa a MongoDB"
```

Aplicación disponible en **https://18.221.214.90**.

## 11. Fase 6 · Alertas en Slack y rotación de logs

### 11.1 Webhook de Slack (navegador)

1. `api.slack.com/apps` → **Create New App → Blank app** → nombre y workspace.
2. Scope **`incoming-webhook`** → instalar en el workspace → canal `#alertas-servidor`.
3. **Incoming Webhooks** → *On* → copiar la URL `https://hooks.slack.com/services/...`.

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Prueba de alerta - Práctica 08"}' \
  https://hooks.slack.com/services/<TU_URL>
```

### 11.2 Módulo de alertas (EC2)

```bash
pm2 install pm2-slack
pm2 set pm2-slack:slack_url "https://hooks.slack.com/services/<TU_URL>"
pm2 set pm2-slack:stop true
pm2 set pm2-slack:exit true
pm2 set pm2-slack:error true
pm2 set pm2-slack:restart true
pm2 save --force
pm2 conf pm2-slack
```

> Se usa `pm2-slack` (módulo de PM2 instalado con `pm2 install`). Los eventos `stop` y `exit` vienen desactivados por defecto.

### 11.3 Rotación de logs (EC2)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 save --force

ls -lh /var/www/empleados/shared/logs/          # out.log, err.log y out__AAAA-MM-DD_HH-mm-ss.log.gz
```

Forzar una rotación para demostración:

```bash
pm2 set pm2-logrotate:max_size 1K
for i in $(seq 50); do curl -s localhost:3000/api/v1/health > /dev/null; done
sleep 35 && ls -lh /var/www/empleados/shared/logs/
pm2 set pm2-logrotate:max_size 10M && pm2 save --force
```

## 12. Pruebas de verificación

### 12.1 Prueba de red

| Acción | Resultado esperado |
| --- | --- |
| Abrir `http://18.221.214.90` | Redirige a `https://18.221.214.90` y muestra la app |
| Login y CRUD de empleados | Funciona a través de Nginx |
| Abrir `http://18.221.214.90:3000` | No responde (puerto cerrado) |

### 12.2 Prueba de resiliencia (EC2)

```bash
pm2 stop empleados-app          # alerta en #alertas-servidor · el sitio responde 502
pm2 start empleados-app         # servicio restablecido
pm2 sendSignal SIGKILL empleados-app   # caída abrupta: PM2 reinicia solo (↺ aumenta)
```

### 12.3 Prueba de CI/CD (PC)

```bash
# Cambio visual en frontend/src/app/components/login-page/login-page.component.html
#   <span class="brand">RR.HH. Panel</span>  →  <span class="brand">RR.HH. Panel · Desplegado en AWS v2</span>
cd /c/diseno-patrones-apis
git commit -am "feat: cambio visual para prueba de CI/CD"
git push origin diseno-patrones-apis
cd practica08 && pm2 deploy production
```

Recargar con **Ctrl + F5**: el cambio aparece sin entrar a la consola de AWS. `pm2 reload` reinicia las instancias una a una (*zero-downtime*).

## 13. Operación diaria

| Tarea | Dónde | Comando |
| --- | --- | --- |
| Desplegar cambios de código | PC | `git push origin diseno-patrones-apis` → `pm2 deploy production` |
| Cambiar secretos (URI, JWT) | EC2 | `nano /var/www/empleados/shared/.env` → `pm2 reload empleados-app --update-env` |
| Ver procesos | PC | `pm2 deploy production exec "pm2 list"` |
| Ver logs | EC2 | `pm2 logs empleados-app --lines 50 --nostream` |
| Volver a la versión anterior | PC | `pm2 deploy production revert 1` |
| Monitor en vivo | EC2 | `pm2 monit` |
| Gestión de Nginx | EC2 | `sudo nginx -t` · `sudo systemctl reload nginx` · `sudo tail -f /var/log/nginx/error.log` |

## 14. Solución de problemas

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `ERR_CONNECTION_REFUSED` en HTTPS | La configuración de Nginx no se guardó (no hay bloque 443) | Reescribir el archivo con `sudo tee` (7.5) y `sudo systemctl restart nginx` |
| `Could not get lock /var/lib/dpkg/lock-frontend` | Otro `apt` en ejecución | Esperar; si está colgado: `sudo kill <pid>` y `sudo dpkg --configure -a` |
| `Key is invalid` al agregar la deploy key | No se copió la llave pública | Copiar solo la línea `ssh-ed25519 …` de `id_ed25519.pub` |
| `protocol '…https' is not supported` | URL HTTPS mezclada en la plantilla SSH | `repo: 'git@github.com:hmoyon/diseno-patrones-apis.git'` |
| `destination path 'source' already exists` | `setup` ya se había ejecutado | No repetir `setup`; usar `pm2 deploy production` |
| `deploying origin/main` / `backend/.env: No such file` | Rama incorrecta o falta `cd practica08` | `ref: 'origin/diseno-patrones-apis'` y `'cd practica08'` al inicio del post-deploy |
| `cd: …/current/practica08: No such file` | Solo se hizo `setup`, falta `deploy` | `pm2 deploy production` |
| `bad auth : Authentication failed` | Credenciales de Atlas incorrectas | Regenerar contraseña, probar con 9.4, actualizar `shared/.env` y `pm2 reload --update-env` |
| `Killed` durante `ng build` | Falta memoria | Activar swap (7.2) |
| 502 Bad Gateway | La app no está corriendo | `pm2 list` · `pm2 logs empleados-app` |
| No llegan alertas | `stop`/`exit` desactivados o URL errónea | `pm2 conf pm2-slack` · `pm2 restart pm2-slack` |
| No entra por SSH | Cambió la IP pública del administrador | Actualizar la regla 22 a *Mi IP* |

## 15. Seguridad

- Solo los puertos **80/443** son públicos; **22** restringido a la IP del administrador; **3000** aislado.
- Tráfico cifrado con **TLS 1.2/1.3** (certificado autofirmado; en producción real usar dominio + Let's Encrypt).
- Secretos en `/var/www/empleados/shared/.env` con `chmod 600`, **fuera del repositorio** (que es público).
- Deploy key de **solo lectura** limitada a un repositorio.
- La URL del webhook de Slack se configura solo en el servidor.
- Al finalizar: liberar la IP elástica y detener la instancia (AWS cobra por hora las IPv4 públicas).

## 16. Referencias

- [Nginx · ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Nginx · Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [PM2 · Deployment System](https://pm2.keymetrics.io/docs/usage/deployment/)
- [PM2 · Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [AWS · Elastic IP addresses](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)
- [Slack · Sending messages using incoming webhooks](https://api.slack.com/messaging/webhooks)
- [MongoDB Atlas · IP Access List](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [NodeSource · Node.js binary distributions](https://github.com/nodesource/distributions)

## Autor

**Héctor Moyón Amaya** — Maestría de Software