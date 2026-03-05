/**
 * transaction-file-logger.ts
 *
 * Singleton que escribe las transacciones en:
 *   logs/YYYY-MM-DD/transactions.log
 *
 * Formato de cada línea:
 *   [DATE TIME] [TXN] [txId] STATUS METHOD /path | ... | Xms
 */

import * as fs from 'fs';
import * as path from 'path';

// ── constantes ───────────────────────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI_RE, '');

const LOGS_ROOT = process.env.LOGS_ROOT ?? path.resolve(__dirname, '..', '..', '..', '..', '..', 'logs');

// ── estado interno ───────────────────────────────────────────────────────────
let currentDate = '';
let txStream: fs.WriteStream | null = null;
let combinedStream: fs.WriteStream | null = null;
let errorsStream: fs.WriteStream | null = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function timestamp(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 12);
}

function getStreams(): {
  tx: fs.WriteStream;
  combined: fs.WriteStream;
  errors: fs.WriteStream;
} {
  const date = today();

  // Rotar streams cuando cambia el día
  if (date !== currentDate) {
    txStream?.end();
    combinedStream?.end();
    errorsStream?.end();

    const dir = path.join(LOGS_ROOT, date);
    fs.mkdirSync(dir, { recursive: true });

    const open = (name: string) =>
      fs.createWriteStream(path.join(dir, name), { flags: 'a', encoding: 'utf-8' });

    txStream       = open('transactions.log');
    combinedStream = open('combined.log');
    errorsStream   = open('errors.log');
    currentDate    = date;

    // Marcador de inicio de sesión
    const header = `\n${'─'.repeat(72)}\n[${date} ${timestamp()}] ▶  GATEWAY TRANSACTIONS\n${'─'.repeat(72)}\n`;
    txStream.write(header);
    combinedStream.write(header);
  }

  return { tx: txStream!, combined: combinedStream!, errors: errorsStream! };
}

// ── tipos públicos ───────────────────────────────────────────────────────────
export type TxStatus = 'START' | 'SUCCESS' | 'FAILED';

export interface TxEntry {
  txId:     string;
  status:   TxStatus;
  method:   string;
  path:     string;
  httpStatus?: number;
  userId?:  string;
  durationMs?: number;
  errorMsg?: string;
}

// ── función principal ────────────────────────────────────────────────────────
export function writeTransaction(entry: TxEntry): void {
  const { tx, combined, errors } = getStreams();
  const { txId, status, method, path: reqPath, httpStatus, userId, durationMs, errorMsg } = entry;

  const date    = today();
  const time    = timestamp();
  const prefix  = `[${date} ${time}] [TXN]`;

  const parts: string[] = [
    `[txId: ${txId}]`,
    status.padEnd(7),
    `${method.padEnd(6)} ${reqPath}`,
  ];

  if (userId)     parts.push(`user: ${userId}`);
  if (httpStatus) parts.push(`status: ${httpStatus}`);
  if (durationMs !== undefined) parts.push(`${durationMs}ms`);
  if (errorMsg)   parts.push(`| ERR: ${stripAnsi(errorMsg)}`);

  const line = `${prefix} ${parts.join(' | ')}\n`;

  tx.write(line);
  combined.write(line);
  if (status === 'FAILED') errors.write(line);
}
