/**
 * @file src/middleware/authMiddleware.ts
 * @description JWT authentication middleware for Express.
 *   Verifies the Bearer token from the Authorization header,
 *   fetches the corresponding user from MongoDB,
 *   and attaches { _id, name, email, role, avatar, currency } to req.user.
 *   Returns 401 if the token is missing, invalid, or expired.
 *   Returns 404 if the user no longer exists in the database.
 * Connected to: authRoutes.ts, expenseRoutes.ts, budgetRoutes.ts (all protected routes)
 * Owner: Backend Developer
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// ─── Extend Express Request Type ─────────────────────────────────────────────

/**
 * Augments the Express Request interface to include an optional `user` field.
 * After authMiddleware runs, req.user is guaranteed to be populated.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id:      string;
        name:     string;
        email:    string;
        role:     string;
        avatar:   string;
        currency: string;
      };
    }
  }
}

// ─── JWT Payload Shape ────────────────────────────────────────────────────────

/** Shape of the decoded JWT payload we sign and verify */
interface JwtPayload {
  id: string;      // MongoDB user _id as string
  iat: number;     // Issued at (Unix timestamp)
  exp: number;     // Expires at (Unix timestamp)
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Express middleware to protect routes with JWT authentication.
 *
 * Flow:
 *  1. Extract token from "Authorization: Bearer <token>" header.
 *  2. Verify the token signature and expiry using JWT_SECRET env var.
 *  3. Find the user in MongoDB by the decoded ID.
 *  4. Attach sanitised user object to req.user and call next().
 *
 * @param req  - Express Request
 * @param res  - Express Response
 * @param next - Express NextFunction
 */
export async function protect(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── Step 1: Extract token ──────────────────────────────────────
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        data:    null,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    // Format: "Bearer eyJhbGci..."
    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        data:    null,
        message: 'Token is missing from the Authorization header.',
      });
      return;
    }

    // ── Step 2: Verify token signature + expiry ────────────────────
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured on the server.');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (jwtError) {
      // Distinguish between expired and invalid tokens for clearer UX messaging
      const isExpired = (jwtError as Error).name === 'TokenExpiredError';
      res.status(401).json({
        success: false,
        data:    null,
        message: isExpired
          ? 'Your session has expired. Please log in again.'
          : 'Invalid token. Please log in again.',
      });
      return;
    }

    // ── Step 3: Fetch user from DB ─────────────────────────────────
    // Explicitly exclude `password` from the query result
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      // User was deleted after the token was issued
      res.status(404).json({
        success: false,
        data:    null,
        message: 'The account associated with this token no longer exists.',
      });
      return;
    }

    // ── Step 4: Attach sanitised user to request ───────────────────
    req.user = {
      _id:      (user._id as mongoose.Types.ObjectId).toString(),
      name:     user.name,
      email:    user.email,
      role:     user.role,
      avatar:   user.avatar,
      currency: user.currency,
    };

    next(); // Proceed to the actual route handler

  } catch (error) {
    // Unexpected server error
    console.error('[authMiddleware] Unexpected error:', error);
    res.status(500).json({
      success: false,
      data:    null,
      message: 'Internal server error during authentication.',
    });
  }
}

// ─── Role Guard (optional) ────────────────────────────────────────────────────

/**
 * Middleware factory: restricts route access to specific roles.
 * Must be used AFTER the `protect` middleware.
 *
 * Usage: router.delete('/users/:id', protect, requireRole('admin'), handler)
 *
 * @param roles - Array of allowed role strings (e.g. ['admin'])
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        data:    null,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }
    next();
  };
}

// Add missing mongoose import
import mongoose from 'mongoose';
