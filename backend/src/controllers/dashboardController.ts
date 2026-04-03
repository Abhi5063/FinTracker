/**
 * @file src/controllers/dashboardController.ts
 * @description Aggregates data for the main FinTrack dashboard.
 *   All queries are scoped to req.user._id for strict data isolation.
 *   Uses MongoDB aggregation pipelines for performance.
 * Routes:
 *   GET /api/dashboard/summary              — KPI stats for stat cards
 *   GET /api/dashboard/category-breakdown   — Pie chart data
 *   GET /api/dashboard/spending-trend       — Line chart (last 30 days)
 *   GET /api/dashboard/monthly-comparison   — Bar chart (last 6 months) BONUS
 * Connected to: dashboardRoutes.ts, Expense.ts, Budget.ts
 * Owner: Backend Developer
 */

import { Request, Response } from 'express';
import mongoose               from 'mongoose';
import { subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import Expense from '../models/Expense';
import Budget  from '../models/Budget';

// ─── Category colour map (used in pie chart response) ─────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Food:          '#F97316',
  Rent:          '#EF4444',
  Shopping:      '#A855F7',
  Travel:        '#3B82F6',
  Entertainment: '#EC4899',
  Health:        '#10B981',
  Education:     '#06B6D4',
  Utilities:     '#6366F1',
  Other:         '#94A3B8',
};

// ─── GET /api/dashboard/summary ───────────────────────────────────────────────

/**
 * Returns high-level KPI metrics for the 4 stat cards on the dashboard.
 * Auth: required
 * Returns:
 *   totalSpentThisMonth    — sum of all expenses in current month
 *   totalSpentLastMonth    — sum of all expenses in previous month
 *   monthOverMonthChange   — percentage change (current vs last month)
 *   topCategory            — category with highest spend this month
 *   totalExpensesCount     — number of expense records this month
 *   topPaymentMethods      — top 3 payment methods by usage count
 */
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    const userId  = new mongoose.Types.ObjectId(req.user!._id);
    const now     = new Date();
    const startCurrent = startOfMonth(now);
    const endCurrent   = endOfMonth(now);
    const startLast    = startOfMonth(subMonths(now, 1));
    const endLast      = endOfMonth(subMonths(now, 1));

    // Run all aggregations in parallel for performance
    const [currentMonthAgg, lastMonthAgg, categoryAgg, countAgg, paymentAgg] = await Promise.all([
      // Sum of this month's expenses
      Expense.aggregate([
        { $match: { userId, date: { $gte: startCurrent, $lte: endCurrent } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Sum of last month's expenses (for MoM change)
      Expense.aggregate([
        { $match: { userId, date: { $gte: startLast, $lte: endLast } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Top category this month
      Expense.aggregate([
        { $match: { userId, date: { $gte: startCurrent, $lte: endCurrent } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
      // Count of transactions this month
      Expense.countDocuments({ userId, date: { $gte: startCurrent, $lte: endCurrent } }),
      // Top 3 payment methods
      Expense.aggregate([
        { $match: { userId, date: { $gte: startCurrent, $lte: endCurrent } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]),
    ]);

    const totalSpentThisMonth = currentMonthAgg[0]?.total ?? 0;
    const totalSpentLastMonth = lastMonthAgg[0]?.total   ?? 0;
    const monthOverMonthChange = totalSpentLastMonth > 0
      ? Math.round(((totalSpentThisMonth - totalSpentLastMonth) / totalSpentLastMonth) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSpentThisMonth:  Math.round(totalSpentThisMonth  * 100) / 100,
        totalSpentLastMonth:  Math.round(totalSpentLastMonth  * 100) / 100,
        monthOverMonthChange,
        topCategory:          categoryAgg[0]?._id ?? null,
        topCategoryAmount:    Math.round((categoryAgg[0]?.total ?? 0) * 100) / 100,
        totalExpensesCount:   countAgg,
        topPaymentMethods:    paymentAgg.map(p => ({
          method:  p._id,
          count:   p.count,
          total:   Math.round(p.total * 100) / 100,
        })),
      },
      message: 'Dashboard summary retrieved.',
    });
  } catch (error) {
    console.error('[dashboardController.getDashboardSummary]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to load dashboard summary.' });
  }
}

// ─── GET /api/dashboard/category-breakdown ────────────────────────────────────

/**
 * Returns spending breakdown by category for the current month.
 * Used by the CategoryPieChart component.
 * Auth: required
 * Returns: [{ category, total, percentage, color }] sorted by total desc
 */
export async function getCategoryBreakdown(req: Request, res: Response): Promise<void> {
  try {
    const userId       = new mongoose.Types.ObjectId(req.user!._id);
    const startCurrent = startOfMonth(new Date());
    const endCurrent   = endOfMonth(new Date());

    const agg = await Expense.aggregate([
      { $match: { userId, date: { $gte: startCurrent, $lte: endCurrent } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = agg.reduce((sum, row) => sum + row.total, 0);

    const breakdown = agg.map(row => ({
      category:   row._id,
      total:      Math.round(row.total * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0,
      color:      CATEGORY_COLORS[row._id] ?? '#94A3B8',
    }));

    res.status(200).json({
      success: true,
      data:    { breakdown, grandTotal: Math.round(grandTotal * 100) / 100 },
      message: 'Category breakdown retrieved.',
    });
  } catch (error) {
    console.error('[dashboardController.getCategoryBreakdown]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to get category breakdown.' });
  }
}

// ─── GET /api/dashboard/spending-trend ────────────────────────────────────────

/**
 * Returns daily spending totals for the last 30 days.
 * Used by the SpendingLineChart component.
 * Auth: required
 * Returns: [{ date: "YYYY-MM-DD", amount }] — one entry per day with any spend
 */
export async function getSpendingTrend(req: Request, res: Response): Promise<void> {
  try {
    const userId    = new mongoose.Types.ObjectId(req.user!._id);
    const startDate = subDays(new Date(), 29); // last 30 days inclusive

    const agg = await Expense.aggregate([
      { $match: { userId, date: { $gte: startDate } } },
      {
        $group: {
          _id:    { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const trend = agg.map(row => ({
      date:   row._id,
      amount: Math.round(row.amount * 100) / 100,
    }));

    res.status(200).json({
      success: true,
      data:    { trend },
      message: 'Spending trend retrieved.',
    });
  } catch (error) {
    console.error('[dashboardController.getSpendingTrend]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to get spending trend.' });
  }
}

// ─── GET /api/dashboard/monthly-comparison ────────────────────────────────────

/**
 * BONUS: Returns total spending for each of the last 6 months.
 * Used by the MonthlyBarChart component.
 * Auth: required
 * Returns: [{ month: "Jan 2024", amount, monthKey: "2024-01" }]
 */
export async function getMonthlyComparison(req: Request, res: Response): Promise<void> {
  try {
    const userId   = new mongoose.Types.ObjectId(req.user!._id);
    const now      = new Date();
    const start    = startOfMonth(subMonths(now, 5)); // 6 months ago
    const end      = endOfMonth(now);

    const agg = await Expense.aggregate([
      { $match: { userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id:    {
            year:  { $year: '$date' },
            month: { $month: '$date' },
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const currentMonthKey = format(now, 'yyyy-MM');

    const comparison = agg.map(row => {
      const d        = new Date(row._id.year, row._id.month - 1, 1);
      const monthKey = format(d, 'yyyy-MM');
      return {
        month:       format(d, 'MMM yyyy'),
        monthKey,
        amount:      Math.round(row.amount * 100) / 100,
        isCurrent:   monthKey === currentMonthKey,
      };
    });

    res.status(200).json({
      success: true,
      data:    { comparison },
      message: 'Monthly comparison retrieved.',
    });
  } catch (error) {
    console.error('[dashboardController.getMonthlyComparison]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to get monthly comparison.' });
  }
}
