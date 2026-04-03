/**
 * @file src/routes/dashboardRoutes.ts
 * @description Express router for dashboard aggregation endpoints.
 * Connected to: dashboardController.ts, authMiddleware.ts, app.ts
 * Owner: Backend Developer
 */

import { Router } from 'express';
import {
  getDashboardSummary, getCategoryBreakdown,
  getSpendingTrend,    getMonthlyComparison,
} from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/summary',              getDashboardSummary);
router.get('/category-breakdown',   getCategoryBreakdown);
router.get('/spending-trend',       getSpendingTrend);
router.get('/monthly-comparison',   getMonthlyComparison);

export default router;
