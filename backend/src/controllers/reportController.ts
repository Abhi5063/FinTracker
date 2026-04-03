/**
 * @file src/controllers/reportController.ts
 * @description Controller for monthly report endpoints.
 *   Reads pre-aggregated data from SQLite (MonthlyReport model).
 *   Writes are handled by reportService.ts (triggered from here or cron).
 *
 * Routes:
 *   GET  /api/reports              — last 3 months of reports (current user)
 *   GET  /api/reports/:month       — specific month report (format: YYYY-MM)
 *   POST /api/reports/generate     — manually trigger report generation
 *   GET  /api/reports/admin/all    — all users current-month totals (admin only)
 *
 * SQL query reference (embedded as comments):
 *   -- Get top spending users this month (admin):
 *     SELECT userId, totalSpent FROM monthly_reports
 *     WHERE month = '2024-01' ORDER BY totalSpent DESC LIMIT 10;
 *
 *   -- Get 3-month trend for a user:
 *     SELECT month, totalSpent FROM monthly_reports
 *     WHERE userId = ? ORDER BY month DESC LIMIT 3;
 *
 * Connected to: reportRoutes.ts, MonthlyReport.ts (Sequelize), reportService.ts
 * Owner: Backend Developer
 */

import { Request, Response } from 'express';
import { Op }                from 'sequelize';
import { format, subMonths } from 'date-fns';
import { MonthlyReport }     from '../models/MonthlyReport';
import { generateMonthlyReport } from '../services/reportService';
import logger                from '../utils/logger';

// ─── GET /api/reports ─────────────────────────────────────────────────────────

/**
 * Returns the last 3 months of pre-generated reports for the current user.
 * Auth: required (protect middleware)
 * Query params:
 *   months — number of months to fetch (default: 3, max: 12)
 *
 * SQL equivalent:
 *   SELECT month, totalSpent FROM monthly_reports
 *   WHERE userId = ? ORDER BY month DESC LIMIT 3;
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const userId    = req.user!._id;
    const monthsReq = Math.min(12, parseInt(req.query.months as string ?? '3', 10));

    // Build the list of YYYY-MM strings to look up (last N months)
    const monthKeys: string[] = [];
    for (let i = 0; i < monthsReq; i++) {
      monthKeys.push(format(subMonths(new Date(), i), 'yyyy-MM'));
    }

    const reports = await MonthlyReport.findAll({
      where: {
        userId: userId.toString(),
        month:  { [Op.in]: monthKeys },
      },
      order: [['month', 'DESC']],
    });

    // Deserialize JSON fields for each report
    const serialized = reports.map(r => ({
      ...r.toJSON(),
      overbudgetCategories: r.parsedOverbudgetCategories,
      categoryBreakdown:    r.parsedCategoryBreakdown,
    }));

    res.status(200).json({
      success: true,
      data:    { reports: serialized, totalCount: reports.length },
      message: 'Reports retrieved successfully.',
    });
  } catch (error) {
    logger.error('[reportController.getReports]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to fetch reports.' });
  }
}

// ─── GET /api/reports/:month ──────────────────────────────────────────────────

/**
 * Returns a specific month's report for the current user.
 * Auth: required
 * Param: month — "YYYY-MM" format (e.g. "2024-04")
 *
 * If the report hasn't been generated yet, returns 404 with a helpful message.
 * The user can trigger generation via POST /api/reports/generate.
 */
export async function getReportByMonth(req: Request, res: Response): Promise<void> {
  try {
    const userId    = req.user!._id;
    const monthYear = req.params.month;

    // Validate format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      res.status(400).json({
        success: false, data: null,
        message: 'Month must be in YYYY-MM format (e.g. "2024-04").',
      });
      return;
    }

    const report = await MonthlyReport.findOne({
      where: { userId: userId.toString(), month: monthYear },
    });

    if (!report) {
      res.status(404).json({
        success: false,
        data:    null,
        message: `No report found for ${monthYear}. Use POST /api/reports/generate to create one.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...report.toJSON(),
        overbudgetCategories: report.parsedOverbudgetCategories,
        categoryBreakdown:    report.parsedCategoryBreakdown,
      },
      message: 'Report retrieved successfully.',
    });
  } catch (error) {
    logger.error('[reportController.getReportByMonth]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to fetch report.' });
  }
}

// ─── POST /api/reports/generate ───────────────────────────────────────────────

/**
 * Manually triggers report generation for a specific month.
 * Auth: required
 * Body: { monthYear?: string } — defaults to current month if not provided.
 *
 * This calls reportService.generateMonthlyReport() which:
 *   1. Reads expenses + budgets from MongoDB
 *   2. Calculates stats
 *   3. Upserts into SQLite
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
  try {
    const userId    = req.user!._id;
    const monthYear = req.body.monthYear ?? format(new Date(), 'yyyy-MM');

    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      res.status(400).json({
        success: false, data: null,
        message: 'monthYear must be in YYYY-MM format.',
      });
      return;
    }

    const report = await generateMonthlyReport(userId.toString(), monthYear);

    res.status(200).json({
      success: true,
      data: {
        ...report.toJSON(),
        overbudgetCategories: report.parsedOverbudgetCategories,
        categoryBreakdown:    report.parsedCategoryBreakdown,
      },
      message: `Report for ${monthYear} generated successfully.`,
    });
  } catch (error) {
    logger.error('[reportController.generateReport]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to generate report.' });
  }
}

// ─── GET /api/reports/admin/all ───────────────────────────────────────────────

/**
 * ADMIN ONLY: Returns all users' reports for the current month.
 * Checks req.user.role === 'admin' (enforced by requireRole middleware in route).
 * Auth: required + admin role
 *
 * SQL equivalent:
 *   SELECT userId, totalSpent FROM monthly_reports
 *   WHERE month = '2024-01' ORDER BY totalSpent DESC LIMIT 10;
 */
export async function getAdminAllReports(req: Request, res: Response): Promise<void> {
  try {
    const monthYear = (req.query.monthYear as string) ?? format(new Date(), 'yyyy-MM');

    const reports = await MonthlyReport.findAll({
      where: { month: monthYear },
      order: [['totalSpent', 'DESC']],
      limit: 50,
    });

    // Platform-level aggregation
    const totalUsers        = new Set(reports.map(r => r.userId)).size;
    const totalTransactions = reports.reduce((s, r) => s + r.totalTransactions, 0);
    const totalTracked      = reports.reduce((s, r) => s + r.totalSpent, 0);

    const serialized = reports.map(r => ({
      ...r.toJSON(),
      overbudgetCategories: r.parsedOverbudgetCategories,
      categoryBreakdown:    r.parsedCategoryBreakdown,
    }));

    res.status(200).json({
      success: true,
      data: {
        reports: serialized,
        platformStats: {
          totalUsers,
          totalTransactions,
          totalTracked: Math.round(totalTracked * 100) / 100,
          monthYear,
        },
      },
      message: 'Admin report data retrieved.',
    });
  } catch (error) {
    logger.error('[reportController.getAdminAllReports]', error);
    res.status(500).json({ success: false, data: null, message: 'Failed to fetch admin reports.' });
  }
}
