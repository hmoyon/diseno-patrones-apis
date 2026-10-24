// ecosystem.config.js — PM2: procesos (Fase 4) + despliegue automatizado (Fase 5)
const APP_DIR = '/var/www/empleados';

module.exports = {
  apps: [
    {
      name: 'empleados-app',
      cwd: './backend',              // dotenv lee backend/.env (enlace al .env de shared/)
      script: 'dist/index.js',
      instances: 'max',              // Modo clúster: un proceso por vCPU
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      // Solo variables NO secretas; los secretos van en shared/.env del servidor
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
      ref: 'origin/main',
      repo: 'git@github.com:hmoyon/https://github.com/hmoyon/diseno-patrones-apis.git',
      path: APP_DIR,
      ssh_options: ['IdentityFile=~/.ssh/practica08-aws.pem', 'StrictHostKeyChecking=accept-new'],
      'pre-setup': `mkdir -p ${APP_DIR}/shared/logs`,
      'post-deploy': [
        `ln -sfn ${APP_DIR}/shared/.env backend/.env`,
        'cd backend && npm ci && npm run build && cd ..',
        'cd frontend && npm ci && npm run build:aws && cd ..',
        'pm2 reload ecosystem.config.js --env production --update-env',
        'pm2 save',
      ].join(' && '),
    },
  },
};