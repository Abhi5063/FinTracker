/**
 * @file src/utils/db.ts
 * @description Database connection utilities for FinTrack backend.
 *   Handles both MongoDB (primary) and SQLite (reports cache) connections.
 *   Exports: connectMongoDB, connectSQLite, sequelize (Sequelize instance)
 *   The `sequelize` export is used by MonthlyReport.ts model.
 * Owner: Backend Developer
 */

import mongoose  from 'mongoose';
import { Sequelize } from 'sequelize';

// ─── SQLite / Sequelize Instance ──────────────────────────────────────────────
/**
 * Exported Sequelize instance — imported by MonthlyReport.ts and other SQL models.
 * Storage path resolved from SQLITE_DB_PATH env var (defaults to ./fintrack_reports.db).
 */
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_DB_PATH ?? './fintrack_reports.db',
  logging: process.env.NODE_ENV === 'development'
    ? (sql: string) => console.debug('[SQLite]', sql)
    : false,
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────

/**
 * Connects to MongoDB using the MONGODB_URI env variable.
 * Throws if the env var is missing or the connection fails.
 */
export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set.');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS:          45000,
  });

  console.log('✅ MongoDB connected.');

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost — attempting to reconnect...');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });
}

// ─── SQLite Connection ────────────────────────────────────────────────────────

/**
 * Authenticates and syncs the SQLite database.
 * Uses `alter: true` to update tables if schema changes — safe for development.
 * In production, prefer running migrations instead of alter sync.
 */
export async function connectSQLite(): Promise<void> {
  await sequelize.authenticate();

  // Import all SQL models here so they register with Sequelize before sync
  await import('../models/MonthlyReport');

  // Sync all models to SQLite (create tables if they don't exist)
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });

  console.log('✅ SQLite connected and synced.');
}
