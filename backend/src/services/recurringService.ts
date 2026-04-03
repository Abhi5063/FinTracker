/**
 * @file src/services/recurringService.ts
 * @description Handles automatic creation of recurring expenses.
 *   Called daily at 06:00 AM IST by the cron job (cronJobs.ts).
 *   Logic:
 *     1. Find all Expense documents with isRecurring=true
 *        and recurringDay = today's day of month
 *     2. For each, check if an expense for this category + user
 *        already exists in the current month (idempotency check)
 *     3. If not found, create a new expense clone for today
 * Connected to: cronJobs.ts, Expense.ts
 * Owner: Backend Developer
 */

import mongoose from 'mongoose';
import Expense  from '../models/Expense';
import logger   from '../utils/logger';

/**
 * Checks for recurring expenses due today and creates new copies if not already added.
 * Designed to be idempotent — safe to run multiple times on the same day.
 *
 * @returns Summary { checked, created, skipped } counts
 */
export async function processRecurringExpenses(): Promise<{
  checked: number;
  created: number;
  skipped: number;
}> {
  const today     = new Date();
  const todayDay  = today.getDate();     // 1–31
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();   // 0-indexed

  logger.info(`[RecurringService] Processing recurring expenses for day=${todayDay}`);

  // ── Step 1: Find all recurring expense templates that fire today ──────────
  const recurringExpenses = await Expense.find({
    isRecurring:  true,
    recurringDay: todayDay,
  }).lean();

  let created = 0;
  let skipped = 0;

  // ── Step 2: For each, check idempotency and create if needed ──────────────
  for (const template of recurringExpenses) {
    try {
      const startOfMonth = new Date(todayYear, todayMonth, 1);
      const endOfMonth   = new Date(todayYear, todayMonth + 1, 0, 23, 59, 59);

      // Check: has this category already been added this month for this user?
      const existingThisMonth = await Expense.findOne({
        userId:   template.userId,
        category: template.category,
        // Check that it's not the template itself
        _id:      { $ne: template._id },
        date:     { $gte: startOfMonth, $lte: endOfMonth },
        // Identify as auto-created by checking notes prefix
        notes:    { $regex: '^[AUTO-RECURRING]', $options: 'i' },
      });

      if (existingThisMonth) {
        logger.debug(
          `[RecurringService] Skipped: userId=${template.userId.toString()} category=${template.category} — already added this month`,
        );
        skipped++;
        continue;
      }

      // Create a new expense for today based on the template
      await Expense.create({
        userId:        template.userId,
        amount:        template.amount,
        category:      template.category,
        date:          today,
        paymentMethod: template.paymentMethod,
        notes:         `[AUTO-RECURRING] ${template.notes ?? ''}`.trim(),
        isRecurring:   false, // The copy itself is NOT a recurring template
        recurringDay:  undefined,
      });

      logger.info(
        `[RecurringService] Created: userId=${template.userId.toString()} category=${template.category} amount=${template.amount}`,
      );
      created++;
    } catch (err) {
      logger.error(`[RecurringService] Error processing template ${template._id}:`, err);
    }
  }

  logger.info(
    `[RecurringService] Done: checked=${recurringExpenses.length} created=${created} skipped=${skipped}`,
  );
  return { checked: recurringExpenses.length, created, skipped };
}
