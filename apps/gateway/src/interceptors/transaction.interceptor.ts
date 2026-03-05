/**
 * transaction.interceptor.ts
 *
 * Interceptor global del API Gateway.
 * Por cada petición HTTP:
 *   1. Genera un txId único (crypto.randomUUID)
 *   2. Inyecta X-Transaction-Id en la respuesta
 *   3. Registra START → SUCCESS / FAILED con método, ruta, usuario, duración y
 *      código HTTP en:
 *        • logs/YYYY-MM-DD/transactions.log
 *        • logs/YYYY-MM-DD/combined.log
 *        • logs/YYYY-MM-DD/errors.log  (solo FAILED)
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { writeTransaction } from './transaction-file-logger';

// Campos que NUNCA se loguean en el body
const SENSITIVE = new Set(['password', 'password_confirm', 'token', 'secret', 'cvv', 'card_number']);

function sanitizeBody(body: Record<string, unknown> | undefined): string {
  if (!body || typeof body !== 'object') return '';
  const safe = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, SENSITIVE.has(k) ? '***' : v]),
  );
  return JSON.stringify(safe);
}

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Transaction');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = ctx.switchToHttp().getRequest();
    const res    = ctx.switchToHttp().getResponse();
    const txId   = crypto.randomUUID();
    const start  = Date.now();
    const method = req.method as string;
    const reqPath  = req.url   as string;
    const userId = (req.user as { id?: string } | undefined)?.id;

    // Exponer el txId al cliente
    res.setHeader('X-Transaction-Id', txId);

    // ── START ──────────────────────────────────────────────────────────────
    const bodyLog = sanitizeBody(req.body as Record<string, unknown>);
    const startMsg = `[txId: ${txId}] START   ${method.padEnd(6)} ${reqPath}${userId ? ` | user: ${userId}` : ''}${bodyLog ? ` | body: ${bodyLog}` : ''}`;
    this.logger.log(startMsg);
    writeTransaction({ txId, status: 'START', method, path: reqPath, userId });

    return next.handle().pipe(
      // ── SUCCESS ───────────────────────────────────────────────────────────
      tap(() => {
        const durationMs   = Date.now() - start;
        const httpStatus = res.statusCode as number;
        const msg = `[txId: ${txId}] SUCCESS ${method.padEnd(6)} ${reqPath} | status: ${httpStatus} | ${durationMs}ms`;
        this.logger.log(msg);
        writeTransaction({ txId, status: 'SUCCESS', method, path: reqPath, httpStatus, userId, durationMs });
      }),
      // ── FAILED ────────────────────────────────────────────────────────────
      catchError((err: unknown) => {
        const durationMs = Date.now() - start;
        const httpStatus =
          (err as { status?: number; statusCode?: number })?.status ??
          (err as { status?: number; statusCode?: number })?.statusCode ??
          500;
        const errorMsg =
          (err as { message?: string })?.message ?? 'Unknown error';

        const msg = `[txId: ${txId}] FAILED  ${method.padEnd(6)} ${reqPath} | status: ${httpStatus} | ${durationMs}ms | ${errorMsg}`;
        this.logger.error(msg);
        writeTransaction({ txId, status: 'FAILED', method, path: reqPath, httpStatus, userId, durationMs, errorMsg });

        return throwError(() => err);
      }),
    );
  }
}
