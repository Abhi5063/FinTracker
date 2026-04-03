/**
 * @file src/models/Expense.ts
 * @description Mongoose schema for individual expense entries.
 *   Each expense belongs to a User (userId ref).
 *   Supports optional recurring expense metadata (isRecurring, recurringDay).
 *   Indexed on userId + date for fast user-scoped queries.
 * Connected to: expenseController.ts, dashboardController.ts, Python AI service
 * Owner: Backend Developer
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// ─── Category + PaymentMethod Enums ──────────────────────────────────────────

export type ExpenseCategory =
  | 'Food' | 'Rent' | 'Shopping' | 'Travel'
  | 'Entertainment' | 'Health' | 'Education'
  | 'Utilities' | 'Other';

export type PaymentMethod =
  | 'UPI' | 'Credit Card' | 'Debit Card'
  | 'Cash' | 'Net Banking' | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food','Rent','Shopping','Travel','Entertainment',
  'Health','Education','Utilities','Other',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI','Credit Card','Debit Card','Cash','Net Banking','Other',
];

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IExpense extends Document {
  _id:           mongoose.Types.ObjectId;
  userId:        mongoose.Types.ObjectId;  // Reference to User._id
  amount:        number;
  category:      ExpenseCategory;
  date:          Date;
  paymentMethod: PaymentMethod;
  notes?:        string;
  isRecurring:   boolean;                  // BONUS: monthly recurring flag
  recurringDay?: number;                   // BONUS: day of month (1–28)
  createdAt:     Date;
  updatedAt:     Date;
}

interface ExpenseModel extends Model<IExpense> {}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ExpenseSchema = new Schema<IExpense, ExpenseModel>(
  {
    /** Reference to the owning user — required for ownership checks */
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'userId is required.'],
      index:    true,  // Indexed for fast user-scoped queries
    },

    /** Expense amount — must be a positive number */
    amount: {
      type:     Number,
      required: [true, 'Amount is required.'],
      min:      [0.01, 'Amount must be at least ₹0.01.'],
    },

    /** Category of the expense — from fixed enum list */
    category: {
      type:     String,
      enum:     { values: EXPENSE_CATEGORIES, message: '{VALUE} is not a valid category.' },
      required: [true, 'Category is required.'],
    },

    /** Date the expense was incurred — defaults to today */
    date: {
      type:     Date,
      required: [true, 'Date is required.'],
      default:  () => new Date(),
    },

    /** How the expense was paid */
    paymentMethod: {
      type:     String,
      enum:     { values: PAYMENT_METHODS, message: '{VALUE} is not a valid payment method.' },
      required: [true, 'Payment method is required.'],
      default:  'UPI',
    },

    /** Optional free-text notes — max 500 chars */
    notes: {
      type:      String,
      maxlength: [500, 'Notes cannot exceed 500 characters.'],
      trim:      true,
    },

    /** BONUS: if true, this expense repeats every month */
    isRecurring: {
      type:    Boolean,
      default: false,
    },

    /**
     * BONUS: day of month this expense recurs on (1–28).
     * Only valid when isRecurring is true.
     * Max 28 to avoid month-end edge cases.
     */
    recurringDay: {
      type:     Number,
      min:      [1,  'Recurring day must be between 1 and 28.'],
      max:      [28, 'Recurring day must be between 1 and 28.'],
      validate: {
        validator(this: IExpense, v: number) {
          // Only present when isRecurring is true
          return this.isRecurring ? v != null : true;
        },
        message: 'recurringDay is required when isRecurring is true.',
      },
    },
  },
  { timestamps: true },
);

// ─── Compound Indexes ─────────────────────────────────────────────────────────

/** Optimise user-scoped date-range queries (most common query pattern) */
ExpenseSchema.index({ userId: 1, date: -1 });
/** Optimise filtering by user + category */
ExpenseSchema.index({ userId: 1, category: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────
const Expense = mongoose.model<IExpense, ExpenseModel>('Expense', ExpenseSchema);
export default Expense;
