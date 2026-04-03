/**
 * @file src/routes/budgetRoutes.ts
 * @description Express router for budget management endpoints.
 *   NOTE: /status route must come before the root / route.
 * Connected to: budgetController.ts, authMiddleware.ts, app.ts
 * Owner: Backend Developer
 */

import { Router }  from 'express';
import {
  getBudgets, setBudget, getBudgetStatus, budgetValidation,
} from '../controllers/budgetController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

// /status before / to avoid ambiguity
router.get('/status', getBudgetStatus);
router.get('/',       getBudgets);
router.post('/',      budgetValidation, setBudget);

export default router;
