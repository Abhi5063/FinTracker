/**
 * @file src/routes/authRoutes.ts
 * @description Express router for authentication endpoints.
 *   POST /api/auth/register — Public: create new account
 *   POST /api/auth/login    — Public: login and get JWT
 *   GET  /api/auth/me       — Protected: get current user profile
 * Connected to: authController.ts, authMiddleware.ts, app.ts
 * Owner: Backend Developer
 */

import { Router } from 'express';
import {
  register,
  login,
  getMe,
  registerValidation,
  loginValidation,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// ── Public Routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 * Runs registerValidation middleware before the controller.
 */
router.post('/register', registerValidation, register);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Runs loginValidation middleware before the controller.
 */
router.post('/login', loginValidation, login);

// ── Protected Routes ───────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * `protect` middleware verifies JWT and attaches req.user before getMe runs.
 */
router.get('/me', protect, getMe);

export default router;
