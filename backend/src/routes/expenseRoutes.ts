/**
 * @file src/routes/expenseRoutes.ts
 * @description Express router for expense CRUD endpoints.
 *   All routes are protected by the `protect` JWT middleware.
 *   NOTE: /export route must be defined BEFORE /:id to avoid
 *   "export" being matched as a MongoDB ObjectId.
 * Connected to: expenseController.ts, authMiddleware.ts, app.ts
 * Owner: Backend Developer
 */

import { Router }  from 'express';
import {
  getExpenses, createExpense, updateExpense,
  deleteExpense, exportExpenses, expenseValidation,
} from '../controllers/expenseController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All expense routes require authentication
router.use(protect);

// IMPORTANT: /export must come before /:id — order matters in Express routing
router.get('/export', exportExpenses);

router.get('/',    getExpenses);
router.post('/',   expenseValidation, createExpense);
router.put('/:id', expenseValidation, updateExpense);
router.delete('/:id', deleteExpense);

export default router;
