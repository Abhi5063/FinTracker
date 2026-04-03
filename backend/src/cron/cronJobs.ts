/**
 * @file src/cron/cronJobs.ts
 * @description Scheduled cron jobs for FinTrack backend.
 *   Uses `node-cron` package (npm install node-cron @types/node-cron)
 *   Jobs:
 *     1. Monthly report generation  — 1st of every month at 00:05 AM IST
 *     2. Recurring expense auto-add — Every day at 06:00 AM IST
 *   Called from: app.ts (after DB connections established)
 * Owner: Backend Developer
 */

import cron from 'node-cron';
import logger from '../utils/logger';
import { generateReportsForAllUsers } from '../services/reportService';
import { processRecurringExpenses }   from '../services/recurringService';
import { format, subMonths }          from 'date-fns';

/**
 * Registers and starts all cron jobs.
 * Call this AFTER connecting to MongoDB and SQLite.
 */
export function startCronJobs(): void {
  logger.info('[Cron] Starting scheduled jobs...');

  // ── Job 1: Monthly Report Generation ─────────────────────────────────────
  /**
   * Cron: "5 0 1 * *" → 00:05 AM on the 1st of every month (server time)
   * Generates reports for the PREVIOUS month (since it runs on the 1st).
   * Adjust timezone: IST = UTC+5:30, so adjust server cron accordingly.
   */
  cron.schedule('5 0 1 * *', async () => {
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    logger.info(`[Cron] Monthly report job started for month=${lastMonth}`);
    try {
      const result = await generateReportsForAllUsers(lastMonth);
      logger.info(`[Cron] Monthly reports: ${result.generated} generated, ${result.failed} failed`);
    } catch (err) {
      logger.error('[Cron] Monthly report job failed:', err);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ── Job 2: Recurring Expense Auto-Add ────────────────────────────────────
  /**
   * Cron: "0 6 * * *" → 06:00 AM daily (IST)
   * Auto-creates expense copies for any recurring expense templates
   * that have recurringDay === today's date.
   */
  cron.schedule('0 6 * * *', async () => {
    logger.info('[Cron] Recurring expense job started');
    try {
      const result = await processRecurringExpenses();
      logger.info(
        `[Cron] Recurring: ${result.checked} checked, ${result.created} created, ${result.skipped} skipped`,
      );
    } catch (err) {
      logger.error('[Cron] Recurring expense job failed:', err);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  logger.info('[Cron] All jobs scheduled.');
}
