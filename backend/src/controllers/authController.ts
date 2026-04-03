/**
 * @file src/controllers/authController.ts
 * @description Express controller for all authentication endpoints.
 *   Routes handled:
 *     POST /api/auth/register — Create new user, return JWT
 *     POST /api/auth/login    — Verify credentials, return JWT + user
 *     GET  /api/auth/me       — Return current user (protected, no password)
 *   All responses follow: { success: boolean, data: T, message: string }
 * Connected to: authRoutes.ts, User.ts model, authMiddleware.ts
 * Owner: Backend Developer
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User';

// ─── Helper: Sign JWT ─────────────────────────────────────────────────────────

/**
 * Signs a new JWT with the user's MongoDB _id as the payload.
 * @param userId - MongoDB ObjectId (as string)
 * @returns Signed JWT string
 * @throws Error if JWT_SECRET is not set
 */
function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');

  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions,
  );
}

// ─── Validation Rules (express-validator) ─────────────────────────────────────

/** Validation chain for the register endpoint */
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

/** Validation chain for the login endpoint */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * Registers a new user account.
 *
 * Validation steps (in order):
 *  1. express-validator checks on name, email, password
 *  2. Check email is not already taken (returns 409 Conflict)
 *  3. Create user document (password is hashed by pre-save hook in User.ts)
 *  4. Sign JWT and return { token, user } — password excluded from response
 *
 * @returns 201 Created on success, 400 on validation failure, 409 on duplicate email
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    // ── 1. Input validation ────────────────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return the first validation error message for simplicity
      res.status(400).json({
        success: false,
        data:    null,
        message: errors.array()[0].msg,
      });
      return;
    }

    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    // ── 2. Check for existing email ────────────────────────────────
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        data:    null,
        message: 'An account with this email already exists. Try signing in instead.',
      });
      return;
    }

    // ── 3. Create user (pre-save hook handles hashing + avatar) ────
    const user = await User.create({ name, email, password });

    // ── 4. Sign JWT and return response ───────────────────────────
    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      data:    {
        token,
        // Build the safe user object — never include password
        user: {
          _id:      user._id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          avatar:   user.avatar,
          currency: user.currency,
          createdAt: user.createdAt,
        },
      },
      message: 'Account created successfully.',
    });

  } catch (error) {
    console.error('[authController.register] Error:', error);
    res.status(500).json({
      success: false,
      data:    null,
      message: 'An unexpected error occurred during registration. Please try again.',
    });
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * Authenticates an existing user.
 *
 * Validation steps:
 *  1. express-validator checks on email, password
 *  2. Find user by email — select('+password') to override schema's select:false
 *  3. Compare password with stored hash via IUser.comparePassword()
 *  4. Sign JWT and return { token, user } — password excluded from response
 *
 * @returns 200 OK on success, 400 on validation error, 401 on wrong credentials
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // ── 1. Input validation ────────────────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        data:    null,
        message: errors.array()[0].msg,
      });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    // ── 2. Find user + include password for comparison ─────────────
    // select('+password') is required because the schema sets select: false
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Use a generic message to avoid leaking whether the email exists
      res.status(401).json({
        success: false,
        data:    null,
        message: 'Invalid email or password. Please try again.',
      });
      return;
    }

    // ── 3. Verify password ─────────────────────────────────────────
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        data:    null,
        message: 'Invalid email or password. Please try again.',
      });
      return;
    }

    // ── 4. Sign JWT and return ─────────────────────────────────────
    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      data:    {
        token,
        user: {
          _id:      user._id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          avatar:   user.avatar,
          currency: user.currency,
          createdAt: user.createdAt,
        },
      },
      message: 'Login successful.',
    });

  } catch (error) {
    console.error('[authController.login] Error:', error);
    res.status(500).json({
      success: false,
      data:    null,
      message: 'An unexpected error occurred during login. Please try again.',
    });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Returns the currently authenticated user's profile.
 * Protected — uses `protect` middleware from authMiddleware.ts.
 * The user object is already attached to req.user by the middleware.
 *
 * @returns 200 with the user object (no password)
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    // req.user is set by the protect() middleware — guaranteed to exist here
    if (!req.user) {
      res.status(401).json({
        success: false,
        data:    null,
        message: 'Not authenticated.',
      });
      return;
    }

    // Fetch latest user data from DB in case profile was updated elsewhere
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        data:    null,
        message: 'User not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data:    {
        _id:      user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        avatar:   user.avatar,
        currency: user.currency,
        createdAt: user.createdAt,
      },
      message: 'User profile retrieved successfully.',
    });

  } catch (error) {
    console.error('[authController.getMe] Error:', error);
    res.status(500).json({
      success: false,
      data:    null,
      message: 'An unexpected error occurred fetching your profile.',
    });
  }
}
