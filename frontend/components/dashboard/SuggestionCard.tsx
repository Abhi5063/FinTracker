'use client';

/**
 * @file components/dashboard/SuggestionCard.tsx
 * @description Displays a single AI-generated spending suggestion from the Python service.
 *   - Color-coded LEFT border matching severity: info=blue, warning=amber, danger=red, success=green
 *   - Shows: severity icon, category pill, main message, italic saving_tip,
 *             bold green "Potential savings: ₹X", dismiss button (top-right)
 *   - Dismissible: dismissed suggestion IDs stored in localStorage
 *     IDs are derived from `${category}-${message.slice(0,20)}`
 * Connected to: dashboard/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   suggestion — single SuggestionType object from /api/analyze
 *   onDismiss  — callback called when user dismisses the card
 */

import { useState }         from 'react';
import { X, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { cn }               from '@/lib/utils';
import type { SpendingSuggestion } from '@/types';

// ─── Severity Configuration ───────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  info: {
    border: '#3B82F6',
    bg:     'rgba(59,130,246,0.07)',
    text:   '#60A5FA',
    icon:   Info,
    label:  'Insight',
  },
  warning: {
    border: '#F59E0B',
    bg:     'rgba(245,158,11,0.07)',
    text:   '#FCD34D',
    icon:   AlertTriangle,
    label:  'Warning',
  },
  danger: {
    border: '#EF4444',
    bg:     'rgba(239,68,68,0.07)',
    text:   '#F87171',
    icon:   Zap,
    label:  'High Priority',
  },
  success: {
    border: '#10B981',
    bg:     'rgba(16,185,129,0.07)',
    text:   '#34D399',
    icon:   CheckCircle,
    label:  'Great News',
  },
  low: {
    border: '#10B981',
    bg:     'rgba(16,185,129,0.07)',
    text:   '#34D399',
    icon:   CheckCircle,
    label:  'Info',
  },
} as const;

type SeverityKey = keyof typeof SEVERITY_CONFIG;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: SpendingSuggestion;
  onDismiss?: (id: string) => void;
}

// ─── Derive stable ID from suggestion ─────────────────────────────────────────

function getSuggestionId(s: SpendingSuggestion): string {
  return `${s.category}-${s.message.slice(0, 30)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuggestionCard({ suggestion, onDismiss }: SuggestionCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const id       = getSuggestionId(suggestion);
  const severity = (suggestion.severity ?? 'info') as SeverityKey;
  const cfg      = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const SeverityIcon = cfg.icon;

  /* ── Dismiss handler ────────────────────────────────────────── */
  const handleDismiss = () => {
    // Persist to localStorage so it's gone on next mount too
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('fintrack_dismissed_suggestions') ?? '[]');
      if (!stored.includes(id)) stored.push(id);
      localStorage.setItem(
        'fintrack_dismissed_suggestions',
        JSON.stringify(stored),
      );
    } catch {}

    setDismissed(true);
    onDismiss?.(id);
  };

  if (dismissed) return null;

  return (
    <div
      className="relative rounded-card border-l-[3px] p-4 text-sm transition-all duration-200 hover:scale-[1.01]"
      style={{
        background:   cfg.bg,
        borderLeft:   `3px solid ${cfg.border}`,
        borderTop:    `1px solid ${cfg.border}20`,
        borderRight:  `1px solid ${cfg.border}20`,
        borderBottom: `1px solid ${cfg.border}20`,
      }}
      role="article"
      aria-label={`${cfg.label}: ${suggestion.category}`}
    >
      {/* ── Dismiss button ────────────────────────────────────── */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss suggestion"
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={13} />
      </button>

      {/* ── Header: severity icon + category ─────────────────── */}
      <div className="flex items-center gap-2 mb-2 pr-7">
        <SeverityIcon size={14} style={{ color: cfg.text }} />
        <span className="text-xs font-semibold" style={{ color: cfg.text }}>
          {cfg.label}
        </span>

        {/* Category pill */}
        <span
          className="rounded-badge px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: `${cfg.border}20`,
            color:       cfg.text,
          }}
        >
          {suggestion.category}
        </span>
      </div>

      {/* ── Main message ─────────────────────────────────────── */}
      <p className="mb-1.5 font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {suggestion.message}
      </p>

      {/* ── Saving tip — italicised ───────────────────────────── */}
      {suggestion.saving_tip && (
        <p className="mb-2 text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          💡 {suggestion.saving_tip}
        </p>
      )}

      {/* ── Potential savings — bold green ───────────────────── */}
      {suggestion.potential_savings > 0 && (
        <p className="text-xs font-bold" style={{ color: '#10B981' }}>
          Potential savings: ₹{suggestion.potential_savings.toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Static helper: filter out already-dismissed suggestions ─────────────────

/**
 * Filters a list of suggestions, removing any with IDs stored in localStorage.
 * Call before rendering SuggestionCard components.
 *
 * @param suggestions — full list from /api/analyze
 * @returns filtered list (dismissed ones removed)
 */
export function filterDismissedSuggestions(suggestions: SpendingSuggestion[]): SpendingSuggestion[] {
  try {
    const dismissed: string[] = JSON.parse(localStorage.getItem('fintrack_dismissed_suggestions') ?? '[]');
    return suggestions.filter(s => !dismissed.includes(getSuggestionId(s)));
  } catch {
    return suggestions;
  }
}
