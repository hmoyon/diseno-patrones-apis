// practica08/ecosystem.config.js — PM2: procesos (Fase 4) + despliegue automatizado (Fase 5)
// El repo es diseno-patrones-apis; esta práctica vive en la subcarpeta practica08/
const APP_DIR = '/var/www/empleados';

module.exports = {
  apps: [
    {
      name: 'empleados-app',
      cwd: './backend',              // relativo a practica08/; dotenv lee backend/.env
      script: 'dist/index.js',
      instances: 'max',              // Modo clúster: un proceso por vCPU
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
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