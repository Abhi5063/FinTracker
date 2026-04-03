/**
 * @file src/models/Budget.ts
 * @description Mongoose schema for monthly category budgets.
 *   One document per user per category per month (enforced via compound unique index).
 *   monthYear stored as "YYYY-MM" string for easy querying and display.
 * Connected to: budgetController.ts, dashboardController.ts
 * Owner: Backend Developer
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import { ExpenseCategory, EXPENSE_CATEGORIES } from './Expense';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IBudget extends Document {
  _id:         mongoose.Types.ObjectId;
  userId:      mongoose.Types.ObjectId;  // Reference to User._id
  category:    ExpenseCategory;
  monthYear:   string;                   // Format: "YYYY-MM" e.g. "2024-04"
  limitAmount: number;                   // The budget ceiling in user's currency
  createdAt:   Date;
  updatedAt:   Date;
}

interface BudgetModel extends Model<IBudget> {}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BudgetSchema = new Schema<IBudget, BudgetModel>(
  {
    /** Reference to the owning user */
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'userId is required.'],
      index:    true,
    },

    /** Expense category this budget applies to */
    category: {
      type:     String,
      enum:     { values: EXPENSE_CATEGORIES, message: '{VALUE} is not a valid category.' },
      required: [true, 'Category is required.'],
    },

    /**
     * Month+Year this budget is for, stored as "YYYY-MM".
     * Using a string instead of separate fields simplifies index and upsert logic.
     * Example: "2024-04" for April 2024.
     */
    monthYear: {
      type:     String,
      required: [true, 'monthYear is required.'],
      match:    [/^\d{4}-\d{2}$/, 'monthYear must be in "YYYY-MM" format.'],
    },

    /** Maximum amount allowed for this category in this month */
    limitAmount: {
      type:     Number,
      required: [true, 'Limit amount is required.'],
      min:      [1, 'Limit must be at least 1.'],
    },
  },
  { timestamps: true },
);

// ─── Compound Unique Index ────────────────────────────────────────────────────

/**
 * Ensures only ONE budget exists per user+category+month.
 * The upsert in budgetController relies on this index.
 */
BudgetSchema.index({ userId: 1, category: 1, monthYear: 1 }, { unique: true });

// ─── Export ───────────────────────────────────────────────────────────────────
const Budget = mongoose.model<IBudget, BudgetModel>('Budget', BudgetSchema);
export default Budget;
