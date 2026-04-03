"""
File: analyzer.py
Description: Core Pandas-based spending analysis engine for FinTrack AI service.
  Analyzes the last 30 days of expense data and generates smart suggestions.

Suggestion rules (6 implemented):
  1. High spend category  : if category > 40% of total → "spending a lot on X"
  2. Increased spending   : current month category > last month by >25%
  3. Top payment method   : insights on most-used payment method
  4. Savings opportunity  : if Food > 5000 → suggest meal planning
  5. Budget proximity     : if category ≥ 85% of budget → "close to X budget"
  6. Positive reinforce   : if ALL categories under budget → "Great job!"

Connected to: app.py (Flask routes call self.run())
Owner: Python / Data Science Developer
"""

import pandas as pd
import numpy  as np
from typing   import List, Dict, Any, Optional
from datetime import datetime, timedelta


class SpendingAnalyzer:
    """
    Pandas-powered analysis engine.
    All public methods accept raw Python dicts (from JSON) and return plain dicts.
    """

    # ── Data Loading ──────────────────────────────────────────────────────────

    def _load_df(self, expenses: List[Dict]) -> pd.DataFrame:
        """
        Converts raw expense list to a clean DataFrame.
        Parses dates, casts amounts, drops invalid rows.

        @param expenses - list of expense dicts from MongoDB
        @returns Cleaned DataFrame with: date, category, amount, paymentMethod columns
        """
        if not expenses:
            return pd.DataFrame(columns=["date", "category", "amount", "paymentMethod"])

        df = pd.DataFrame(expenses)

        # Validate required columns
        for col in ["amount", "category", "date"]:
            if col not in df.columns:
                raise ValueError(f"Missing required field: '{col}'")

        # Numeric coercion — drop non-positive amounts
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        df = df.dropna(subset=["amount"])
        df = df[df["amount"] > 0]

        # Date parsing
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])

        # Derived columns for grouping
        df["month"]      = df["date"].dt.month
        df["year"]       = df["date"].dt.year
        df["date_only"]  = df["date"].dt.date

        return df.reset_index(drop=True)

    # ── Public: Full Analysis ─────────────────────────────────────────────────

    def run(self, expenses: List[Dict], budgets: Dict[str, float]) -> Dict[str, Any]:
        """
        Entry point for the full analysis pipeline.
        Calls all sub-analysis functions and assembles the final response.

        @param expenses - list of expense dicts (all time, or last 30 days preferred)
        @param budgets  - dict of { category: limitAmount }
        @returns { suggestions: [...], summary: { total_spent, top_category, avg_daily_spend } }
        """
        df = self._load_df(expenses)

        if df.empty:
            return {
                "suggestions": [],
                "summary": {"total_spent": 0, "top_category": None, "avg_daily_spend": 0},
            }

        # Use only last 30 days for primary analysis
        cutoff     = pd.Timestamp.now() - pd.Timedelta(days=30)
        df_recent  = df[df["date"] >= cutoff].copy()
        df_all     = df.copy()

        summary     = self._build_summary(df_recent)
        suggestions = self.generate_suggestions(
            expenses=df_recent.to_dict(orient="records"),
            budgets=budgets,
            df_all=df_all,
        )

        return {"suggestions": suggestions, "summary": summary}

    # ── Core Analysis Functions ────────────────────────────────────────────────

    def calculate_category_totals(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Aggregates total spending per category.

        @param df - Cleaned expense DataFrame
        @returns dict { category: total_amount }
        """
        if df.empty:
            return {}
        grouped = df.groupby("category")["amount"].sum()
        return {k: round(float(v), 2) for k, v in grouped.items()}

    def calculate_month_over_month(self, df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Compares current month vs previous month spend per category.

        @param df - Full (all-time) expense DataFrame
        @returns dict { category: { current, previous, change_pct } }
        """
        if df.empty:
            return {}

        now          = pd.Timestamp.now()
        curr_month   = now.month
        curr_year    = now.year
        prev_dt      = now - pd.DateOffset(months=1)
        prev_month   = prev_dt.month
        prev_year    = prev_dt.year

        df_curr = df[(df["month"] == curr_month) & (df["year"] == curr_year)]
        df_prev = df[(df["month"] == prev_month) & (df["year"] == prev_year)]

        curr_totals  = self.calculate_category_totals(df_curr)
        prev_totals  = self.calculate_category_totals(df_prev)

        all_cats = set(curr_totals) | set(prev_totals)
        result   = {}

        for cat in all_cats:
            curr = curr_totals.get(cat, 0)
            prev = prev_totals.get(cat, 0)
            pct  = 0.0 if prev == 0 else round(((curr - prev) / prev) * 100, 1)
            result[cat] = {"current": curr, "previous": prev, "change_pct": pct}

        return result

    def find_top_categories(self, df: pd.DataFrame, n: int = 3) -> List[Dict]:
        """
        Returns the top N categories by total spend.

        @param df - Expense DataFrame
        @param n  - Number of top categories to return (default: 3)
        @returns List of { category, total, percentage } dicts, sorted desc
        """
        if df.empty:
            return []

        totals      = self.calculate_category_totals(df)
        grand_total = sum(totals.values())

        sorted_cats = sorted(totals.items(), key=lambda x: x[1], reverse=True)[:n]

        return [
            {
                "category":   cat,
                "total":      total,
                "percentage": round((total / grand_total) * 100, 1) if grand_total else 0,
            }
            for cat, total in sorted_cats
        ]

    def detect_unusual_spending(self, df: pd.DataFrame) -> List[Dict]:
        """
        Detects categories where daily spend shows high variability
        (standard deviation > 50% of the mean), suggesting erratic behaviour.

        @param df - Expense DataFrame
        @returns List of { category, mean_daily, std_daily, suggestion } dicts
        """
        if df.empty or len(df) < 5:
            return []

        anomalies = []
        daily = df.groupby(["category", "date_only"])["amount"].sum().reset_index()

        for cat, group in daily.groupby("category"):
            if len(group) < 3:
                continue
            mean = group["amount"].mean()
            std  = group["amount"].std()

            if mean == 0:
                continue

            cv = std / mean  # Coefficient of variation
            if cv > 0.5:     # High variability threshold
                anomalies.append({
                    "category":   str(cat),
                    "mean_daily": round(float(mean), 2),
                    "std_daily":  round(float(std), 2),
                    "suggestion": f"Set a daily ₹{mean:,.0f} limit for {cat} to keep spending consistent.",
                })

        return anomalies

    def generate_suggestions(
        self,
        expenses: List[Dict],
        budgets:  Dict[str, float],
        df_all:   Optional[pd.DataFrame] = None,
    ) -> List[Dict]:
        """
        Main suggestion engine — applies all 6 rules.
        Returns at most 6 suggestions, sorted by severity (danger → warning → info → success).

        Rules applied:
        1. High spend category   (danger)  — any category > 40% of total
        2. Increased spending    (warning) — MoM increase > 25%
        3. Top payment method    (info)    — insight on most used payment method
        4. Savings opportunity   (warning) — Food > ₹5000 → meal planning tip
        5. Budget proximity      (warning) — category ≥ 85% of budget
        6. Positive reinforce    (success) — all categories under 100% of budget

        @param expenses - list of expense dicts for analysis window
        @param budgets  - { category: limit } dict
        @param df_all   - optional full dataframe for MoM comparison
        @returns list of suggestion dicts matching the spec shape
        """
        if not expenses:
            return []

        df = self._load_df(expenses)
        if df.empty:
            return []

        suggestions  = []
        cat_totals   = self.calculate_category_totals(df)
        grand_total  = sum(cat_totals.values())

        # ── Rule 1: High spend category (>40% of total) ──────────────────────
        for cat, total in cat_totals.items():
            pct = (total / grand_total * 100) if grand_total else 0
            if pct > 40:
                suggestions.append({
                    "type":              "warning",
                    "category":          cat,
                    "message":           f"You're spending a lot on {cat} ({pct:.0f}% of total). Try to reduce it by 15%.",
                    "severity":          "danger",
                    "saving_tip":        self._get_saving_tip(cat),
                    "potential_savings": round(total * 0.15, 2),
                })

        # ── Rule 2: MoM increase >25% ─────────────────────────────────────────
        if df_all is not None and len(df_all) > 0:
            mom = self.calculate_month_over_month(df_all)
            for cat, data in mom.items():
                if data["change_pct"] > 25 and data["previous"] > 0:
                    suggestions.append({
                        "type":              "warning",
                        "category":          cat,
                        "message":           f"Your {cat} spending increased by {data['change_pct']:.0f}% vs last month.",
                        "severity":          "warning",
                        "saving_tip":        f"Review recent {cat} transactions and identify what changed.",
                        "potential_savings": round(data["current"] - data["previous"], 2),
                    })

        # ── Rule 3: Top payment method insight ────────────────────────────────
        if "paymentMethod" in df.columns and len(df) >= 3:
            pm_counts = df.groupby("paymentMethod")["amount"].agg(["count", "sum"])
            top_pm    = pm_counts["count"].idxmax()
            top_pm_pct = round((pm_counts.loc[top_pm, "count"] / len(df)) * 100, 0)
            if top_pm_pct >= 50:
                suggestions.append({
                    "type":              "info",
                    "category":          "General",
                    "message":           f"You use {top_pm} for {top_pm_pct:.0f}% of transactions. "
                                         f"Check if cashback rewards are available.",
                    "severity":          "info",
                    "saving_tip":        f"Look for {top_pm} cashback offers or reward programs.",
                    "potential_savings": 0,
                })

        # ── Rule 4: Savings opportunity — Food > ₹5000 ────────────────────────
        food_spend = cat_totals.get("Food", 0)
        if food_spend > 5000:
            suggestions.append({
                "type":              "warning",
                "category":          "Food",
                "message":           f"You've spent ₹{food_spend:,.0f} on Food this month. Meal planning can save up to 30%.",
                "severity":          "warning",
                "saving_tip":        "Try meal prepping on Sundays to reduce daily food costs and avoid impulse orders.",
                "potential_savings": round(food_spend * 0.20, 2),
            })

        # ── Rule 5: Budget proximity (≥85% used) ──────────────────────────────
        for cat, limit in budgets.items():
            if limit <= 0:
                continue
            spent = cat_totals.get(cat, 0)
            pct   = (spent / limit) * 100
            if 85 <= pct < 100:
                remaining = limit - spent
                suggestions.append({
                    "type":              "warning",
                    "category":          cat,
                    "message":           f"You're close to your {cat} budget ({pct:.0f}% used). Only ₹{remaining:,.0f} left.",
                    "severity":          "warning",
                    "saving_tip":        f"Avoid non-essential {cat} spending for the rest of the month.",
                    "potential_savings": 0,
                })
            elif pct >= 100:
                over = spent - limit
                suggestions.append({
                    "type":              "danger",
                    "category":          cat,
                    "message":           f"You've exceeded your {cat} budget by ₹{over:,.0f}!",
                    "severity":          "danger",
                    "saving_tip":        f"Stop {cat} spending immediately and review this month's transactions.",
                    "potential_savings": 0,
                })

        # ── Rule 6: Positive reinforcement ────────────────────────────────────
        if budgets:
            all_under_budget = all(
                cat_totals.get(cat, 0) < limit
                for cat, limit in budgets.items() if limit > 0
            )
            if all_under_budget:
                suggestions.append({
                    "type":              "success",
                    "category":          "General",
                    "message":           "Great job! All budgets are on track this month. 🎉",
                    "severity":          "low",
                    "saving_tip":        "Keep it up! Consider investing the surplus.",
                    "potential_savings": 0,
                })

        # ── Deduplicate + sort by severity ────────────────────────────────────
        severity_order = {"danger": 0, "warning": 1, "info": 2, "low": 3, "success": 4}
        seen           = set()
        unique         = []

        for s in sorted(suggestions, key=lambda x: severity_order.get(x["severity"], 3)):
            key = f'{s["category"]}-{s["severity"]}'
            if key not in seen:
                unique.append(s)
                seen.add(key)

        return unique[:6]  # Return at most 6 suggestions

    # ── Category Stats (endpoint helper) ──────────────────────────────────────

    def category_stats(
        self,
        expenses: List[Dict],
        month:    Optional[int] = None,
        year:     Optional[int] = None,
    ) -> List[Dict]:
        """
        Aggregates spending stats per category, optionally filtered by month/year.

        @param expenses - raw expense list
        @param month    - optional 1–12 filter
        @param year     - optional year filter
        @returns list of { category, total, count, avg, percentage }
        """
        df = self._load_df(expenses)
        if df.empty:
            return []

        if month: df = df[df["month"] == int(month)]
        if year:  df = df[df["year"]  == int(year)]
        if df.empty:
            return []

        grand = df["amount"].sum()
        stats = (
            df.groupby("category")["amount"]
            .agg(total="sum", count="count")
            .reset_index()
        )
        stats["avg"]        = (stats["total"] / stats["count"]).round(2)
        stats["percentage"] = ((stats["total"] / grand) * 100).round(1)
        stats["total"]      = stats["total"].round(2)
        return stats.sort_values("total", ascending=False).to_dict(orient="records")

    # ── Summary builder ───────────────────────────────────────────────────────

    def _build_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Builds the summary block: total_spent, top_category, avg_daily_spend.

        @param df - recent expense DataFrame (last 30 days)
        @returns summary dict
        """
        if df.empty:
            return {"total_spent": 0, "top_category": None, "avg_daily_spend": 0}

        total = round(float(df["amount"].sum()), 2)
        top   = df.groupby("category")["amount"].sum().idxmax()
        days  = df["date_only"].nunique() or 1
        avg   = round(total / days, 2)

        return {"total_spent": total, "top_category": str(top), "avg_daily_spend": avg}

    # ── Saving tip helpers ────────────────────────────────────────────────────

    def _get_saving_tip(self, category: str) -> str:
        """Returns a category-specific money-saving tip."""
        tips = {
            "Food":          "Try meal prepping on Sundays to reduce daily food costs.",
            "Shopping":      "Use a 24-hour wait rule before any non-essential purchase.",
            "Entertainment": "Look for free or discounted events in your area.",
            "Travel":        "Book trips in advance and use price alerts.",
            "Rent":          "Consider negotiating your lease or finding a roommate.",
            "Health":        "Use generic medicines and annual health checkup packages.",
            "Utilities":     "Switch to energy-efficient appliances and LED lighting.",
            "Education":     "Use free online resources (YouTube, Khan Academy) first.",
        }
        return tips.get(category, "Track this category more closely to find savings opportunities.")
