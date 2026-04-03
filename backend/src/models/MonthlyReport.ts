/**
 * @file src/models/MonthlyReport.ts
 * @description Sequelize model for the SQLite `monthly_reports` table.
 *   Stores pre-aggregated monthly summaries for fast historical queries.
 *   Auto-populated by the monthly cron job (runs 1st of each month at 00:05 AM IST).
 *   Manually triggerable via POST /api/reports/generate.
 * Connected to: reportService.ts (writes), reportController.ts (reads), db.ts (sequelize)
 * Used by: ReportsController, Admin dashboard
 * Owner: Backend Developer
 *
 * Schema:
 *   id                    — INTEGER PRIMARY KEY AUTOINCREMENT
 *   userId                — STRING, indexed, NOT NULL
 *   month                 — STRING "YYYY-MM", NOT NULL
 *   totalSpent            — FLOAT
 *   totalTransactions     — INTEGER
 *   topCategory           — STRING (nullable)
 *   topPaymentMethod      — STRING (nullable)
 *   overbudgetCategories  — TEXT (JSON serialized string[])
 *   categoryBreakdown     — TEXT (JSON serialized { category: amount })
 *   savingsRate           — FLOAT (% under total budget; 0 if no budgets)
 *   createdAt             — DATE
 *
 *   UNIQUE constraint: (userId, month)
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../utils/db';

// ─── TypeScript Attribute Interfaces ─────────────────────────────────────────

export interface MonthlyReportAttributes {
  id:                   number;
  userId:               string;
  month:                string;   // "YYYY-MM"
  totalSpent:           number;
  totalTransactions:    number;
  topCategory:          string | null;
  topPaymentMethod:     string | null;
  overbudgetCategories: string;   // JSON: string[]
  categoryBreakdown:    string;   // JSON: Record<string, number>
  savingsRate:          number;
  createdAt:            Date;
}

/** Creation attributes — id and createdAt are auto-generated */
export interface MonthlyReportCreation
  extends Optional<MonthlyReportAttributes, 'id' | 'createdAt'> {}

// ─── Sequelize Model Class ──────────────────────────────────────────────────

export class MonthlyReport
  extends Model<MonthlyReportAttributes, MonthlyReportCreation>
  implements MonthlyReportAttributes
{
  public id!:                   number;
  public userId!:               string;
  public month!:                string;
  public totalSpent!:           number;
  public totalTransactions!:    number;
  public topCategory!:          string | null;
  public topPaymentMethod!:     string | null;
  public overbudgetCategories!: string;
  public categoryBreakdown!:    string;
  public savingsRate!:          number;
  public readonly createdAt!:   Date;

  // ── JSON helper getters ──────────────────────────────────────────
  /** Returns parsed array of overbudget category names */
  get parsedOverbudgetCategories(): string[] {
    try { return JSON.parse(this.overbudgetCategories); }
    catch { return []; }
  }

  /** Returns parsed category → amount mapping */
  get parsedCategoryBreakdown(): Record<string, number> {
    try { return JSON.parse(this.categoryBreakdown); }
    catch { return {}; }
  }
}

// ─── Model Initialisation ────────────────────────────────────────────────────

MonthlyReport.init(
  {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },
    userId: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    /** Format: "YYYY-MM" — e.g. "2024-04" */
    month: {
      type:      DataTypes.STRING(7),
      allowNull: false,
      validate:  { is: /^\d{4}-\d{2}$/ },
    },
    totalSpent: {
      type:         DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalTransactions: {
      type:         DataTypes.INTEGER,
      defaultValue: 0,
    },
    topCategory: {
      type:         DataTypes.STRING,
      allowNull:    true,
      defaultValue: null,
    },
    topPaymentMethod: {
      type:         DataTypes.STRING,
      allowNull:    true,
      defaultValue: null,
    },
    /**
     * JSON-serialised array of category names that exceeded their budget.
     * Example: '["Food","Shopping"]'
     * Use parsedOverbudgetCategories getter for deserialized access.
     */
    overbudgetCategories: {
      type:         DataTypes.TEXT,
      defaultValue: '[]',
    },
    /**
     * JSON-serialised object: { category: totalSpent }
     * Example: '{"Food":5000,"Rent":12000}'
     * Use parsedCategoryBreakdown getter for deserialized access.
     */
    categoryBreakdown: {
      type:         DataTypes.TEXT,
      defaultValue: '{}',
    },
    /** Percentage of total budget that remained unspent (0 if no budgets set) */
    savingsRate: {
      type:         DataTypes.FLOAT,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName:  'monthly_reports',
    timestamps: true,
    updatedAt:  false, // Immutable after creation — generate a new record if needed
    indexes: [
      /** Enforce one report per user per month */
      { unique: true, fields: ['userId', 'month'] },
      /** Index for fast user-scoped lookups */
      { fields: ['userId'] },
    ],
  },
);

export default MonthlyReport;
