/**
 * @file src/services/reportService.ts
 * @description Service that generates and persists monthly reports.
 *   Bridges MongoDB (expense + budget data) → SQLite (monthly_reports table).
 *   Called by:
 *     • Cron job (automatic — 1st of each month at 00:05 AM IST)
 *     • POST /api/reports/generate (manual trigger)
 *
 *   Flow for generateMonthlyReport(userId, monthYear):
 *     1. Parse monthYear → startDate / endDate
 *     2. Query MongoDB for all expenses in that month for that user
 *     3. Query MongoDB for all budgets in that month for that user
 *     4. Calculate: totalSpent, topCategory, topPaymentMethod,
 *                   overbudgetCategories, categoryBreakdown, savingsRate
 *     5. Upsert into SQLite monthly_reports (INSERT OR REPLACE)
 *     6. Return the generated MonthlyReport instance
 *
 * Connected to: reportController.ts, cronJobs.ts, Expense.ts, Budget.ts, MonthlyReport.ts
 * Owner: Backend Developer
 */

import mongoose       from 'mongoose';
import Expense        from '../models/Expense';
import Budget         from '../models/Budget';
import { MonthlyReport } from '../models/MonthlyReport';
import logger         from '../utils/logger';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedReport {
  userId:               string;
  month:                string;
  totalSpent:           number;
  totalTransactions:    number;
  topCategory:          string | null;
  topPaymentMethod:     string | null;
  overbudgetCategories: string[];
  categoryBreakdown:    Record<string, number>;
  savingsRate:          number;
}

// ─── Main Service Function ──────────────────────────────────────────────────────

/**
 * Generates (or regenerates) a monthly report for a specific user and month.
 * Uses upsert: if a report already exists for this user+month, it is replaced.
 *
 * @param userId    — MongoDB ObjectId string of the user
 * @param monthYear — Format "YYYY-MM" (e.g. "2024-04")
 * @returns The generated MonthlyReport Sequelize instance
 */
export async function generateMonthlyReport(
  userId:    string,
  monthYear: string,
): Promise<MonthlyReport> {
  logger.info(`[ReportService] Generating report for user=${userId} month=${monthYear}`);

  // ── Step 1: Parse monthYear to date range ──────────────────────────────────
  const [year, month] = monthYear.split('-').map(Number);
  const startDate     = new Date(year, month - 1, 1);
  const endDate       = new Date(year, month, 0, 23, 59, 59, 999);

  const userObjectId  = new mongoose.Types.ObjectId(userId);

  // ── Step 2: Query MongoDB expenses for this month ──────────────────────────
  const [expenseDocs, budgetDocs] = await Promise.all([
    Expense.find({
      userId: userObjectId,
      date:   { $gte: startDate, $lte: endDate },
    }).lean(),
    Budget.find({
      userId: userObjectId,
      monthYear,
    }).lean(),
  ]);

  // ── Step 3: Calculate stats ────────────────────────────────────────────────

  const totalSpent        = expenseDocs.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactions = expenseDocs.length;

  // Category breakdown: { Food: 5000, Rent: 12000 }
  const categoryBreakdown: Record<string, number> = {};
  expenseDocs.forEach(e => {
    categoryBreakdown[e.category] =
      (categoryBreakdown[e.category] ?? 0) + e.amount;
  });

  // Top category (by amount)
  const topCategory = Object.keys(categoryBreakdown).length > 0
    ? Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0][0]
    : null;

  // Payment method breakdown: { UPI: 12, 'Credit Card': 3 }
  const paymentMethodCounts: Record<string, number> = {};
  expenseDocs.forEach(e => {
    paymentMethodCounts[e.paymentMethod] =
      (paymentMethodCounts[e.paymentMethod] ?? 0) + 1;
  });

  const topPaymentMethod = Object.keys(paymentMethodCounts).length > 0
    ? Object.entries(paymentMethodCounts).sort(([, a], [, b]) => b - a)[0][0]
    : null;

  // Overbudget categories: categories where spend > budget limit
  const overbudgetCategories: string[] = [];
  let totalBudget  = 0;
  let totalSaved   = 0;

  budgetDocs.forEach(b => {
    totalBudget += b.limitAmount;
    const spent  = categoryBreakdown[b.category] ?? 0;
    if (spent > b.limitAmount) {
      overbudgetCategories.push(b.category);
    } else {
      totalSaved += (b.limitAmount - spent);
    }
  });

  // Savings rate: % of total budget that was unspent (only when budgets exist)
  const savingsRate = totalBudget > 0
    ? Math.round((totalSaved / totalBudget) * 100 * 100) / 100
    : 0;

  // ── Step 4: Upsert into SQLite ─────────────────────────────────────────────
  /**
   * SQL equivalent (for reference):
   *   INSERT INTO monthly_reports (userId, month, totalSpent, ...)
   *   VALUES (?, ?, ?, ...)
   *   ON CONFLICT(userId, month) DO UPDATE SET totalSpent = excluded.totalSpent, ...
   */
  const [report] = await MonthlyReport.upsert({
    userId,
    month:                monthYear,
    totalSpent:           Math.round(totalSpent * 100) / 100,
    totalTransactions,
    topCategory,
    topPaymentMethod,
    overbudgetCategories: JSON.stringify(overbudgetCategories),
    categoryBreakdown:    JSON.stringify(
      // Round all amounts to 2 decimal places
      Object.fromEntries(
        Object.entries(categoryBreakdown).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
    ),
    savingsRate,
    createdAt: new Date(),
  });

  logger.info(`[ReportService] Report persisted: userId=${userId} month=${monthYear} total=₹${totalSpent}`);

  return report as MonthlyReport;
}

// ─── Batch Generation ──────────────────────────────────────────────────────────

/**
 * Generates monthly reports for ALL users for a given month.
 * Used by the cron job to run mass report generation at month-end.
 *
 * @param monthYear — "YYYY-MM" of the month to generate reports for
 * @returns Summary of { generated, failed, skipped } counts
 */
export async function generateReportsForAllUsers(monthYear: string): Promise<{
  generated: number;
  failed:    number;
}> {
  // Get all unique user IDs that have expenses in this month
  const [year, month] = monthYear.split('-').map(Number);
  const startDate     = new Date(year, month - 1, 1);
  const endDate       = new Date(year, month, 0, 23, 59, 59, 999);

  const usersWithExpenses = await Expense.distinct('userId', {
    date: { $gte: startDate, $lte: endDate },
  });

  let generated = 0;
  let failed    = 0;

  for (const userId of usersWithExpenses) {
    try {
      await generateMonthlyReport(userId.toString(), monthYear);
      generated++;
    } catch (error) {
      logger.error(`[ReportService] Failed for userId=${userId}: ${error}`);
      failed++;
    }
  }

  logger.info(`[ReportService] Batch complete: ${generated} generated, ${failed} failed.`);
  return { generated, failed };
}
