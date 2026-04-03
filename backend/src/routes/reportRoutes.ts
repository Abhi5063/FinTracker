/**
 * @file src/routes/reportRoutes.ts
 * @description Express router for monthly report endpoints.
 *   NOTE: /generate and /admin/all must be defined BEFORE /:month
 *   to prevent "generate" being matched as a month parameter.
 * Connected to: reportController.ts, authMiddleware.ts, app.ts
 * Owner: Backend Developer
 */

import { Router } from 'express';
import {
  getReports, getReportByMonth, generateReport, getAdminAllReports,
} from '../controllers/reportController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All report routes require authentication
router.use(protect);

// IMPORTANT: static paths before /:month to prevent route conflicts
router.get('/admin/all', requireRole('admin'), getAdminAllReports);
router.post('/generate',                       generateReport);
router.get('/',                                getReports);
router.get('/:month',                          getReportByMonth);

export default router;
