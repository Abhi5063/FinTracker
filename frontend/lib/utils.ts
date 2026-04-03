/**
 * @file lib/utils.ts
 * @description Shared utility functions for FinTrack frontend.
 *   Includes: className merger (cn), currency/date formatters,
 *   budget percentage helpers, number abbreviation, CSV export,
 *   initials generator, string truncation.
 * Connected to: all components that need formatting or class merging
 * Owner: Frontend Developer
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { CurrencyCode } from '@/types';

// ─── Class Name Merger ────────────────────────────────────────────────────────

/**
 * Merges Tailwind utility classes, deduplicating conflicts via tailwind-merge.
 * Drop-in for clsx when using Tailwind CSS.
 * @param inputs - Any number of class strings, objects, or arrays
 * @returns A single merged className string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/** Maps currency codes to their display symbol and Intl locale */
export const CURRENCY_MAP: Record<CurrencyCode, { symbol: string; locale: string }> = {
  INR: { symbol: '₹',    locale: 'en-IN' },
  USD: { symbol: '$',    locale: 'en-US' },
  EUR: { symbol: '€',    locale: 'de-DE' },
  GBP: { symbol: '£',    locale: 'en-GB' },
  JPY: { symbol: '¥',    locale: 'ja-JP' },
  AED: { symbol: 'د.إ', locale: 'ar-AE' },
};

/**
 * Formats a number as a localised currency string using the Intl API.
 * @param amount   - The numeric value
 * @param currency - ISO 4217 currency code (default: 'INR')
 * @returns e.g. "₹1,23,456" or "$1,234.56"
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const { locale } = CURRENCY_MAP[currency] ?? CURRENCY_MAP.INR;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns just the currency symbol for a given code.
 * @param currency - ISO 4217 code
 * @returns Symbol string e.g. "₹"
 */
export function getCurrencySymbol(currency: CurrencyCode = 'INR'): string {
  return CURRENCY_MAP[currency]?.symbol ?? '₹';
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Formats an ISO date string to a human-readable date.
 * @param dateStr - ISO 8601 string from MongoDB
 * @param fmt     - date-fns format string (default: 'dd MMM yyyy')
 * @returns e.g. "15 Apr 2024"
 */
export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr; // Return raw string on parse failure
  }
}

/**
 * Returns a relative time string such as "2 days ago".
 * @param dateStr - ISO 8601 string
 * @returns Relative time string
 */
export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/**
 * Returns the full month name for a 1-based month number.
 * @param month - 1 (January) through 12 (December)
 * @returns Month name string e.g. "April"
 */
export function getMonthName(month: number): string {
  return format(new Date(2024, month - 1, 1), 'MMMM');
}

// ─── Budget Helpers ───────────────────────────────────────────────────────────

/**
 * Calculates budget usage as a percentage, capped at 100.
 * @param spent - Amount spent so far
 * @param limit - Total budget limit
 * @returns Number between 0 and 100
 */
export function getBudgetPercentage(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min((spent / limit) * 100, 100);
}

/**
 * Returns the CSS status class for a budget progress bar.
 * < 60% → 'safe', 60–84% → 'warning', ≥ 85% → 'danger'
 * @param pct - Usage percentage (0–100)
 */
export function getBudgetStatus(pct: number): 'safe' | 'warning' | 'danger' {
  if (pct >= 85) return 'danger';
  if (pct >= 60) return 'warning';
  return 'safe';
}

// ─── Number Utilities ─────────────────────────────────────────────────────────

/**
 * Abbreviates large numbers with locale-specific suffixes.
 * For INR: K, L (lakh), Cr (crore). For others: K, M, B.
 * @param num      - The raw number
 * @param currency - Currency code to pick abbreviation style
 * @returns Abbreviated string e.g. "12.3L" or "1.2M"
 */
export function abbreviateNumber(num: number, currency: CurrencyCode = 'INR'): string {
  if (currency === 'INR') {
    if (num >= 10_000_000) return `${(num / 10_000_000).toFixed(1)}Cr`;
    if (num >= 100_000)    return `${(num / 100_000).toFixed(1)}L`;
    if (num >= 1_000)      return `${(num / 1_000).toFixed(1)}K`;
  } else {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)         return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Generates 2-character initials from a full name.
 * "John Doe" → "JD" | "Alice" → "AL"
 * @param name - Full name string
 * @returns Uppercase initials string
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Truncates a string to maxLen characters, appending "..." if cut.
 * @param str    - Input string
 * @param maxLen - Maximum allowed length (default 30)
 * @returns Truncated string
 */
export function truncate(str: string, maxLen = 30): string {
  return str.length <= maxLen ? str : str.substring(0, maxLen - 3) + '…';
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a generated CSV file.
 * Creates a temporary <a> element, clicks it, then removes it.
 * @param filename - Filename without extension
 * @param headers  - Array of column header strings
 * @param rows     - 2D array of row values (strings or numbers)
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  // Build CSV content: header row + data rows, all values quoted
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob    = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href   = url;
  anchor.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Release the object URL to free memory
  URL.revokeObjectURL(url);
}

// ─── Password Strength ────────────────────────────────────────────────────────

/**
 * Analyses a password and returns its strength level.
 * Weak:   < 8 chars or only one character type
 * Medium: 8+ chars with 2 character types
 * Strong: 8+ chars with 3+ character types
 * @param password - The plain-text password string
 * @returns Strength label and 0–100 score
 */
export function getPasswordStrength(password: string): {
  label: 'weak' | 'medium' | 'strong';
  score: number;
  color: string;
} {
  if (!password) return { label: 'weak', score: 0, color: '#EF4444' };

  let score = 0;
  const checks = [
    /[a-z]/.test(password),          // lowercase
    /[A-Z]/.test(password),          // uppercase
    /[0-9]/.test(password),          // number
    /[^a-zA-Z0-9]/.test(password),   // special char
    password.length >= 8,
    password.length >= 12,
  ];

  score = checks.filter(Boolean).length;

  if (score <= 2 || password.length < 8) {
    return { label: 'weak',   score: 33,  color: '#EF4444' };
  } else if (score <= 4) {
    return { label: 'medium', score: 66,  color: '#F59E0B' };
  } else {
    return { label: 'strong', score: 100, color: '#10B981' };
  }
}
