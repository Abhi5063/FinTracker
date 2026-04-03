/**
 * @file src/controllers/expenseController.ts
 * @description Express controller for all Expense CRUD operations.
 *   All routes are protected — req.user is guaranteed by authMiddleware.
 *   Routes:
 *     GET    /api/expenses         — paginated list with filters
 *     POST   /api/expenses         — create new expense
 *     PUT    /api/expenses/:id     — update (ownership verified)
 *     DELETE /api/expenses/:id     — delete (ownership verified)
 *     GET    /api/expenses/export  — download all as CSV string
 * Connected to: expenseRoutes.ts, Expense.ts model, authMiddleware.ts
 * Owner: Backend Developer
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Expense, { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../models/Expense';

// ─── Validation Chains ────────────────────────────────────────────────────────

/** Shared validation rules for create and update */
export const expenseValidation = [
  body('amount')
    .isNumeric().withMessage('Amount must be a number.')
    .custom(v => v > 0).withMessage('Amount must be greater than 0.'),
  body('category')
    .isIn(EXPENSE_CATEGORIES).withMessage('Invalid category.'),
  body('date')
    .isISO8601().withMessage('Date must be a valid ISO date.'),
  body('paymentMethod')
    .isIn(PAYMENT_METHODS).withMessage('Invalid payment method.'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters.'),
  body('isRecurring')
    .optional().isBoolean(),
  body('recurringDay')
    .optional()
    .isInt({ min: 1, max: 28 }).withMessage('Recurring day must be 1–28.'),
];

// ─── Helper: Verify Ownership ─────────────────────────────────────────────────

/**
 * Checks that the expense exists and belongs to the requesting user.
 * @returns The expense document or null if not found / not owned
 */
async function getOwnedExpense(expenseId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) return null;
  const expense = await Expense.findById(expenseId);
  if (!expense) return null;
  // Ownership check: compare userId fields as strings
  if (expense.userId.toString() !== userId) return null;
  return expense;
}

// ─── GET /api/expenses ────────────────────────────────────────────────────────

/**
 * Returns a paginated, filtered list of expenses for the current user.
 * Auth: required (Bearer token)
 * Query params:
 *   category       - Filter by expense category
 *   paymentMethod  - Filter by payment method
 *   startDate      - ISO date string — filter expenses on or after this date
 *   endDate        - ISO date string — filter expenses on or before this date
 *   search         - Text search in notes field
 *   page           - Page number (default: 1)
 *   limit          - Results per page (default: 10, max: 100)
 */
export async function getExpenses(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const {
      category, paymentMethod,
      startDate, endDate, search,
      page = '1', limit = '10',
    } = req.query as Record<string, string>;

    // ── Build MongoDB filter query ────────────────────────────────
    const query: Record<string, unknown> = { userId };

    if (category)      query.category      = category;
    if (paymentMethod) query.paymentMethod  = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate)   { const end = new Date(endDate); end.setHours(23,59,59,999); dateFilter.$lte = end; }
      query.date = dateFilter;
    }

    // Text search in notes
    if (search) {
      query.notes = { $regex: search, $options: 'i' };
    }

    // ── Pagination ────────────────────────────────────────────────
    const pageNum   = Math.max(1, parseInt(page, 10));
    const limitNum  = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip      = (pageNum - 1) * limitNum;

    // Run count + data query in parallel for efficiency
    const [total, expenses] = await Promise.all([
      Expense.countDocuments(query),
      Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data:    {
        expenses,
        pagination: {
          total,
          page:       pageNum,
          limit:      limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNext:    pageNum < Math.ceil(total / limitNum),
          hasPrev:    pageNum > 1,
        },
      },
      message: 'Expenses retrieved successfully.',
    });
  } catch (error) {
    console.error('[expenseController.getExpenses]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to fetch expenses.' });
  }
}

// ─── POST /api/expenses ───────────────────────────────────────────────────────

/**
 * Creates a new expense for the current user.
 * Auth: required. Validates all fields via expenseValidation chain.
 * Body: { amount, category, date, paymentMethod, notes?, isRecurring?, recurringDay? }
 */
export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, data: null, message: errors.array()[0].msg });
      return;
    }

    const { amount, category, date, paymentMethod, notes, isRecurring, recurringDay } = req.body;

    const expense = await Expense.create({
      userId: req.user!._id,
      amount: parseFloat(amount),
      category,
      date:          new Date(date),
      paymentMethod,
      notes:         notes || undefined,
      isRecurring:   Boolean(isRecurring),
      recurringDay:  isRecurring ? recurringDay : undefined,
    });

    res.status(201).json({
      success: true,
      data:    expense,
      message: 'Expense created successfully.',
    });
  } catch (error) {
    console.error('[expenseController.createExpense]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to create expense.' });
  }
}

// ─── PUT /api/expenses/:id ────────────────────────────────────────────────────

/**
 * Updates an existing expense.
 * Auth: required. Verifies ownership before updating.
 * Param: id — MongoDB ObjectId of the expense to update
 * Body: Same fields as create (all optional for partial update)
 */
export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, data: null, message: errors.array()[0].msg });
      return;
    }

    // Verify ownership
    const expense = await getOwnedExpense(req.params.id, req.user!._id);
    if (!expense) {
      res.status(404).json({ success: false, data: null, message: 'Expense not found or access denied.' });
      return;
    }

    const { amount, category, date, paymentMethod, notes, isRecurring, recurringDay } = req.body;

    // Apply updates — only update fields that were provided
    if (amount        !== undefined) expense.amount        = parseFloat(amount);
    if (category      !== undefined) expense.category      = category;
    if (date          !== undefined) expense.date          = new Date(date);
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (notes         !== undefined) expense.notes         = notes;
    if (isRecurring   !== undefined) expense.isRecurring   = Boolean(isRecurring);
    if (recurringDay  !== undefined) expense.recurringDay  = recurringDay;

    await expense.save();

    res.status(200).json({ success: true, data: expense, message: 'Expense updated successfully.' });
  } catch (error) {
    console.error('[expenseController.updateExpense]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to update expense.' });
  }
}

// ─── DELETE /api/expenses/:id ─────────────────────────────────────────────────

/**
 * Deletes an expense by ID.
 * Auth: required. Verifies ownership before deleting.
 * Param: id — MongoDB ObjectId of the expense to delete
 */
export async function deleteExpense(req: Request, res: Response): Promise<void> {
  try {
    const expense = await getOwnedExpense(req.params.id, req.user!._id);
    if (!expense) {
      res.status(404).json({ success: false, data: null, message: 'Expense not found or access denied.' });
      return;
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, data: null, message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('[expenseController.deleteExpense]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to delete expense.' });
  }
}

// ─── GET /api/expenses/export ─────────────────────────────────────────────────

/**
 * BONUS: Exports all expenses for the current user as a CSV string.
 * Auth: required.
 * Response: text/csv with Content-Disposition: attachment header.
 * The frontend triggers a browser download from this response.
 */
export async function exportExpenses(req: Request, res: Response): Promise<void> {
  try {
    const expenses = await Expense.find({ userId: req.user!._id })
      .sort({ date: -1 })
      .lean();

    // ── Build CSV ─────────────────────────────────────────────────
    const headers = ['Date','Category','Amount','Payment Method','Notes','Recurring'];
    const rows = expenses.map(e => [
      new Date(e.date).toISOString().split('T')[0],
      e.category,
      e.amount,
      e.paymentMethod,
      `"${(e.notes ?? '').replace(/"/g, '""')}"`, // Escape quotes
      e.isRecurring ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fintrack_expenses.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('[expenseController.exportExpenses]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to export expenses.' });
  }
}
