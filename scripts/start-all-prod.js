/** Script para iniciar todos los microservicios compilados (producción) */
const { spawn } = require('child_process');
const path = require('path');
const { createServiceLogger, closeAll } = require('./logger');

const services = [
  { name: 'auth',      dir: 'dist/apps/auth',      color: '\x1b[34m' },
  { name: 'products',  dir: 'dist/apps/products',  color: '\x1b[32m' },
  { name: 'orders',    dir: 'dist/apps/orders',    color: '\x1b[33m' },
  { name: 'customers', dir: 'dist/apps/customers', color: '\x1b[35m' },
  { name: 'cart',      dir: 'dist/apps/cart',      color: '\x1b[36m' },
  { name: 'analytics', dir: 'dist/apps/analytics', color: '\x1b[31m' },
  { name: 'storage',   dir: 'dist/apps/storage',   color: '\x1b[37m' },
  { name: 'gateway',   dir: 'dist/apps/gateway',   color: '\x1b[92m' },
];

const reset = '\x1b[0m';
const rootDir = __dirname.replace(/[\\/]scripts$/, '');

console.log('🚀 Iniciando todos los microservicios en modo producción...\n');
console.log(`📁 Logs guardados en: logs/${new Date().toISOString().slice(0, 10)}/\n`);

const processes = services.map(({ name, dir, color }) => {
  const logger   = createServiceLogger(name);
  const mainPath = path.join(rootDir, dir, 'main.js');

  const proc = spawn('node', [mainPath], {
    cwd: rootDir,
    shell: true,
    env: { ...process.env },
  });

  proc.stdout.on('data', (data) => {
    logger.log(data);
    data.toString().trim().split('\n').forEach(line => {
      console.log(`${color}[${name.toUpperCase().padEnd(10)}]${reset} ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    logger.error(data);
    data.toString().trim().split('\n').forEach(line => {
      console.log(`${color}[${name.toUpperCase().padEnd(10)}]${reset} ${line}`);
    });
  });

  proc.on('close', (code) => {
    logger.close();
    console.log(`${color}[${name.toUpperCase()}] proceso terminado con código ${code}${reset}`);
  });

  return proc;
});

const shutdown = (signal) => {
  console.log('\n🛑 Deteniendo todos los servicios...');
  processes.forEach(p => p.kill(signal));
  closeAll();
  process.exit(0);
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
