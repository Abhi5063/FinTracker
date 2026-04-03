/**
 * @file src/models/User.ts
 * @description Mongoose schema and model for the User collection in MongoDB.
 *   - Stores hashed passwords (bcryptjs, salt rounds: 12)
 *   - Pre-save hook: hashes password + auto-generates avatar initials
 *   - Instance method: comparePassword() for login verification
 *   - Password is never returned in API responses (select: false)
 * Connected to: authController.ts, authMiddleware.ts
 * Owner: Backend Developer
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

/** Supported currency codes — mirrors the frontend type */
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AED';

/** User document interface (extends Mongoose Document) */
export interface IUser extends Document {
  _id:      mongoose.Types.ObjectId;
  name:     string;
  email:    string;
  password: string;         // bcrypt hash — never expose in responses
  role:     'user' | 'admin';
  avatar:   string;         // 2-char initials, e.g. "JD"
  currency: CurrencyCode;
  createdAt: Date;
  updatedAt: Date;

  /** Compares a plain-text password against the stored hash */
  comparePassword(candidate: string): Promise<boolean>;
}

/** Static model type (for mongoose.model<IUser, UserModel>) */
interface UserModel extends Model<IUser> {}

// ─── Schema Definition ────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser, UserModel>(
  {
    /** Display name — required, trimmed */
    name: {
      type:     String,
      required: [true, 'Name is required.'],
      trim:     true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name must be under 80 characters.'],
    },

    /** Email — unique identifier, lowercased on save */
    email: {
      type:      String,
      required:  [true, 'Email is required.'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },

    /**
     * Bcrypt-hashed password.
     * select: false — excluded from all queries by default.
     * Call .select('+password') explicitly when you need to verify it.
     */
    password: {
      type:      String,
      required:  [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      select:    false,
    },

    /** User role — 'admin' can access admin-only routes */
    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },

    /** 2-character uppercase initials, auto-generated from name in pre-save hook */
    avatar: {
      type:    String,
      default: '',
    },

    /** Preferred display currency — used by frontend formatters */
    currency: {
      type:    String,
      enum:    ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED'],
      default: 'INR',
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  },
);

// ─── Pre-Save Hook ────────────────────────────────────────────────────────────

/**
 * Runs before every .save() call.
 * 1. Generates avatar initials from the user's name.
 * 2. Hashes the password with bcrypt (salt rounds: 12) ONLY if it was modified.
 *    This prevents re-hashing an already-hashed password on profile updates.
 */
UserSchema.pre<IUser>('save', async function (next) {
  // ── Generate avatar initials ───────────────────────────────────────
  if (this.isModified('name') || !this.avatar) {
    const parts = this.name.trim().split(/\s+/).filter(Boolean);
    this.avatar =
      parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : this.name.substring(0, 2).toUpperCase();
  }

  // ── Hash password only if it changed ─────────────────────────────
  if (!this.isModified('password')) return next();

  try {
    const salt    = await bcrypt.genSalt(12); // 12 salt rounds — secure default
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compares a plain-text candidate password against the stored bcrypt hash.
 * @param candidate - The plain-text password from the login request
 * @returns Promise<boolean> — true if it matches, false otherwise
 */
UserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });

// ─── Export Model ─────────────────────────────────────────────────────────────
const User = mongoose.model<IUser, UserModel>('User', UserSchema);
export default User;
