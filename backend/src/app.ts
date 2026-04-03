/**
 * @file src/app.ts
 * @description Express application entry point for FinTrack backend API.
 *   Configures: dotenv, Helmet (security headers), CORS, Morgan (request logging),
 *   rate limiting, JSON body parsing, all API routes, 404 handler, global error handler.
 *   Starts the HTTP server after connecting to MongoDB and SQLite.
 * Connected to: all routes, utils/db.ts
 * Owner: Backend Developer
 */

import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import rateLimit    from 'express-rate-limit';

import { connectMongoDB, connectSQLite } from './utils/db';
import logger         from './utils/logger';
import authRoutes      from './routes/authRoutes';
import expenseRoutes   from './routes/expenseRoutes';
import budgetRoutes    from './routes/budgetRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import reportRoutes    from './routes/reportRoutes';
import { startCronJobs } from './cron/cronJobs';

// ─── App Initialisation ───────────────────────────────────────────────────────

const app: Application = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
/**
 * Helmet sets various HTTP headers to protect against common vulnerabilities.
 * E.g. XSS, clickjacking, MIME sniffing, etc.
 */
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
/**
 * Allow requests from the frontend origin defined in CORS_ORIGIN env var.
 * In development this is typically http://localhost:3000.
 */
app.use(
  cors({
    origin:      process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true, // Allow cookies/auth headers
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Request Logging ──────────────────────────────────────────────────────────
/**
 * Morgan 'dev' format: "GET /api/auth/login 200 12ms"
 * Skip logging in test environments.
 */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
/**
 * Apply a global rate limit: max 100 requests per 15 minutes per IP.
 * Auth routes get a stricter limit (20 req / 15 min) to prevent brute-force.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, data: null, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, data: null, message: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
/** Parse incoming JSON request bodies */
app.use(express.json({ limit: '10kb' }));
/** Parse URL-encoded form data */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
/**
 * GET /health — simple liveness probe for deployment platforms (Render, Railway).
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data:    { uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'FinTrack API is running.',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/budgets',   budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports',   reportRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
/**
 * Catches any request that didn't match a registered route.
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data:    null,
    message: `Route not found. Check the API documentation.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
/**
 * Express error-handling middleware (must have 4 params including `err`).
 * Catches any error passed via next(err) from route handlers.
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('[GlobalErrorHandler]', err.stack ?? err.message);
  res.status(500).json({
    success: false,
    data:    null,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
  });
});

// ─── Server Startup ───────────────────────────────────────────────────────────
/**
 * Connect to both databases, then start the HTTP server.
 * Using an IIFE (Immediately Invoked Function Expression) to allow top-level await.
 */
(async () => {
  try {
    // Connect to MongoDB first — primary data store
    await connectMongoDB();
    // Connect to SQLite — secondary store for monthly reports
    await connectSQLite();

    // Start scheduled cron jobs (report generation + recurring expenses)
    startCronJobs();

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`🚀 FinTrack API running on http://localhost:${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
})();

export default app;
