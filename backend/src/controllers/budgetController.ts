/**
 * @file src/controllers/budgetController.ts
 * @description Controller for monthly category budget management.
 *   Routes:
 *     GET  /api/budgets        — all budgets for current user's active month
 *     POST /api/budgets        — create or update budget (upsert)
 *     GET  /api/budgets/status — budget vs. actual spend comparison with status
 * Connected to: budgetRoutes.ts, Budget.ts, Expense.ts
 * Owner: Backend Developer
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { format } from 'date-fns';
import Budget from '../models/Budget';
import Expense, { EXPENSE_CATEGORIES, ExpenseCategory } from '../models/Expense';
import mongoose from 'mongoose';

// ─── Validation ───────────────────────────────────────────────────────────────

export const budgetValidation = [
  body('category').isIn(EXPENSE_CATEGORIES).withMessage('Invalid category.'),
  body('limitAmount').isNumeric().custom(v => v > 0).withMessage('Limit must be > 0.'),
  body('monthYear')
    .optional()
    .matches(/^\d{4}-\d{2}$/).withMessage('monthYear must be YYYY-MM.'),
];

// ─── GET /api/budgets ─────────────────────────────────────────────────────────

/**
 * Returns all budgets set by the current user for the specified month.
 * Auth: required
 * Query params:
 *   monthYear — "YYYY-MM" (defaults to current month if not provided)
 */
export async function getBudgets(req: Request, res: Response): Promise<void> {
  try {
    // Default to current month if not specified
    const monthYear = (req.query.monthYear as string) ?? format(new Date(), 'yyyy-MM');

    const budgets = await Budget.find({
      userId: req.user!._id,
      monthYear,
    }).lean();

    res.status(200).json({
      success: true,
      data:    { budgets, monthYear },
      message: 'Budgets retrieved successfully.',
    });
  } catch (error) {
    console.error('[budgetController.getBudgets]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to fetch budgets.' });
  }
}

// ─── POST /api/budgets ────────────────────────────────────────────────────────

/**
 * Creates or updates a budget for a specific category+month combination.
 * Uses upsert so calling this multiple times is idempotent.
 * Auth: required
 * Body: { category, limitAmount, monthYear? }
 * If monthYear is not provided, defaults to current month.
 */
export async function setBudget(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, data: null, message: errors.array()[0].msg });
      return;
    }

    const { category, limitAmount, monthYear: reqMonthYear } = req.body;
    const monthYear = reqMonthYear ?? format(new Date(), 'yyyy-MM');

    // findOneAndUpdate with upsert:true creates if not exists, updates if exists
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user!._id, category, monthYear },
      { $set: { limitAmount: parseFloat(limitAmount) } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({
      success: true,
      data:    budget,
      message: `Budget for ${category} in ${monthYear} saved.`,
    });
  } catch (error) {
    console.error('[budgetController.setBudget]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to save budget.' });
  }
}

// ─── GET /api/budgets/status ──────────────────────────────────────────────────

/**
 * IMPORTANT: Returns a rich status object for each budget in the current month.
 * For each category that has a budget set, this endpoint:
 *   1. Sums all expenses in that category for the month
 *   2. Calculates percentageUsed = totalSpent / limitAmount * 100
 *   3. Assigns status: 'safe' | 'warning' (>=80%) | 'exceeded' (>=100%)
 *   4. Calculates remaining = limitAmount - totalSpent
 * Auth: required
 * Query params:
 *   monthYear — "YYYY-MM" (defaults to current month)
 *
 * This is used by the frontend to power budget cards, progress bars, and alert banners.
 */
export async function getBudgetStatus(req: Request, res: Response): Promise<void> {
  try {
    const monthYear = (req.query.monthYear as string) ?? format(new Date(), 'yyyy-MM');
    const userId    = new mongoose.Types.ObjectId(req.user!._id);

    // Parse monthYear → start/end Date objects for the Expense query
    const [year, month]  = monthYear.split('-').map(Number);
    const startOfMonth   = new Date(year, month - 1, 1);       // First day of month
    const endOfMonth     = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // ── Fetch all budgets for this user+month ─────────────────────
    const budgets = await Budget.find({ userId, monthYear }).lean();

    if (budgets.length === 0) {
      res.status(200).json({
        success: true,
        data:    { statuses: [], monthYear },
        message: 'No budgets found for this month.',
      });
      return;
    }

    // ── Aggregate expenses per category for this month ─────────────
    // One MongoDB aggregation to get all category totals in one query
    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id:        '$category',
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    // Convert aggregation result to a quick lookup map: { Food: 1200, Rent: 5000 }
    const spentMap: Record<string, number> = {};
    expenseAgg.forEach(row => { spentMap[row._id] = row.totalSpent; });

    // ── Build status objects for each budget ──────────────────────
    const statuses = budgets.map(b => {
      const totalSpent      = spentMap[b.category] ?? 0;
      const percentageUsed  = b.limitAmount > 0
        ? Math.round((totalSpent / b.limitAmount) * 100)
        : 0;
      const remaining       = b.limitAmount - totalSpent;

      // Classify status
      let status: 'safe' | 'warning' | 'exceeded';
      if (percentageUsed >= 100) status = 'exceeded';
      else if (percentageUsed >= 80) status = 'warning';
      else status = 'safe';

      return {
        budgetId:       b._id,
        category:       b.category,
        limitAmount:    b.limitAmount,
        totalSpent:     Math.round(totalSpent * 100) / 100,
        remaining:      Math.round(remaining * 100) / 100,
        percentageUsed,
        status,
        monthYear,
      };
    });

    // Sort: exceeded first, warning second, safe last
    const sortOrder = { exceeded: 0, warning: 1, safe: 2 };
    statuses.sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);

    res.status(200).json({
      success: true,
      data:    { statuses, monthYear },
      message: 'Budget status retrieved successfully.',
    });
  } catch (error) {
    console.error('[budgetController.getBudgetStatus]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to compute budget status.' });
  }
}
