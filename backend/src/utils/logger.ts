/**
 * @file src/utils/logger.ts
 * @description Centralised logging utility for FinTrack backend.
 *   Replaces console.log calls throughout the codebase.
 *   In production: logs only 'error' and 'warn' levels.
 *   In development: logs all levels including 'debug'.
 *   Format: [ISO timestamp] [LEVEL] message
 * Owner: Backend Developer
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';

/** Emits a formatted log line to stdout (info/debug) or stderr (warn/error) */
function log(level: LogLevel, ...args: unknown[]): void {
  // Suppress verbose levels in production
  if (isProd && (level === 'debug' || level === 'info')) return;

  const ts    = new Date().toISOString();
  const label = `[${ts}] [${level.toUpperCase()}]`;
  const out   = level === 'error' || level === 'warn' ? console.error : console.log;

  out(label, ...args);
}

const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info:  (...args: unknown[]) => log('info',  ...args),
  warn:  (...args: unknown[]) => log('warn',  ...args),
  error: (...args: unknown[]) => log('error', ...args),
};

export default logger;
