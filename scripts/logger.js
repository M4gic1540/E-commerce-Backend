/**
 * logger.js
 * Módulo de captura de logs para los microservicios.
 *
 * Estructura de archivos generada:
 *   logs/
 *     YYYY-MM-DD/
 *       combined.log          ← todos los servicios + transacciones del gateway
 *       {service}.log         ← cada servicio por separado
 *       errors.log            ← solo líneas de error / stderr + transacciones FAILED
 *       transactions.log      ← generado por TransactionInterceptor (gateway)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Elimina secuencias de escape ANSI del texto */
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (str) => str.replace(ANSI_RE, '');

/** Retorna la fecha actual en formato YYYY-MM-DD (UTC) */
const today = () => new Date().toISOString().slice(0, 10);

/** Retorna HH:MM:SS.mmm en hora local */
const timestamp = () => new Date().toTimeString().slice(0, 12);

// ── Directorio raíz de logs ─────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', 'logs');

// ── Streams activos: clave = "YYYY-MM-DD" ───────────────────────────────────
const streams = {};

/**
 * Devuelve (creando si hace falta) los streams de escritura para la fecha
 * de hoy y para el servicio indicado.
 *
 * @param {string} service  nombre del microservicio
 * @returns {{ service: fs.WriteStream, combined: fs.WriteStream, errors: fs.WriteStream }}
 */
function getStreams(service) {
  const date = today();
  const key  = `${date}/${service}`;

  if (streams[key]) return streams[key];

  const dir = path.join(ROOT, date);
  fs.mkdirSync(dir, { recursive: true });

  const open = (name) =>
    fs.createWriteStream(path.join(dir, name), { flags: 'a', encoding: 'utf-8' });

  streams[key] = {
    service : open(`${service}.log`),
    combined: open('combined.log'),
    errors  : open('errors.log'),
  };

  // Marcar inicio de sesión
  const header = `\n${'─'.repeat(72)}\n[${date} ${timestamp()}] ▶  ${service.toUpperCase()} iniciado\n${'─'.repeat(72)}\n`;
  streams[key].service.write(header);
  streams[key].combined.write(header);

  return streams[key];
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Crea un logger asociado a un servicio.
 *
 * @param {string} service  nombre del microservicio (ej. "gateway")
 * @returns {{ log: Function, error: Function, close: Function }}
 */
function createServiceLogger(service) {
  /**
   * Escribe una o varias líneas en los archivos de log.
   *
   * @param {string}  rawData  chunk de texto (puede tener \n múltiples)
   * @param {boolean} isError  true → también escribe en errors.log
   */
  function write(rawData, isError = false) {
    const clean = stripAnsi(rawData.toString());
    const lines = clean.split('\n').filter((l) => l.trim() !== '');

    const s = getStreams(service);

    lines.forEach((line) => {
      const level  = isError ? 'ERR' : 'OUT';
      const prefix = `[${today()} ${timestamp()}] [${service.toUpperCase().padEnd(10)}] [${level}]`;
      const entry  = `${prefix} ${line}\n`;

      s.service.write(entry);
      s.combined.write(entry);
      if (isError) s.errors.write(entry);
    });
  }

  return {
    /** Log de stdout */
    log:   (data) => write(data, false),
    /** Log de stderr */
    error: (data) => write(data, true),
    /** Cierra los streams del día actual para este servicio */
    close: () => {
      const key = `${today()}/${service}`;
      if (!streams[key]) return;
      const footer = `[${today()} ${timestamp()}] ■  ${service.toUpperCase()} detenido\n`;
      streams[key].service.write(footer);
      streams[key].combined.write(footer);
      Object.values(streams[key]).forEach((s) => s.end());
      delete streams[key];
    },
  };
}

/**
 * Cierra correctamente todos los streams abiertos.
 * Llama a esta función antes de salir del proceso.
 */
function closeAll() {
  Object.keys(streams).forEach((key) => {
    Object.values(streams[key]).forEach((s) => s.end());
    delete streams[key];
  });
}

module.exports = { createServiceLogger, closeAll };
