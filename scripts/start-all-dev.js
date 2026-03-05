/** Script para iniciar todos los microservicios en desarrollo */
const { spawn } = require('child_process');
const path = require('path');
const { createServiceLogger, closeAll } = require('./logger');

const services = [
  { name: 'auth',      color: '\x1b[34m' },   // azul
  { name: 'products',  color: '\x1b[32m' },   // verde
  { name: 'orders',    color: '\x1b[33m' },   // amarillo
  { name: 'customers', color: '\x1b[35m' },   // magenta
  { name: 'cart',      color: '\x1b[36m' },   // cyan
  { name: 'analytics', color: '\x1b[31m' },   // rojo
  { name: 'storage',   color: '\x1b[37m' },   // blanco
  { name: 'gateway',   color: '\x1b[92m' },   // verde brillante
];

const reset = '\x1b[0m';

console.log('🚀 Iniciando todos los microservicios en modo desarrollo...\n');
console.log(`📁 Logs guardados en: logs/${new Date().toISOString().slice(0, 10)}/\n`);

const processes = services.map(({ name, color }) => {
  const logger = createServiceLogger(name);

  const proc = spawn('pnpm', ['exec', 'nest', 'start', name, '--watch'], {
    cwd: __dirname.replace(/[\\/]scripts$/, ''),
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
