"""
File: app.py
Description: FinTrack Python AI Spending Analysis Service.
  Flask REST API that analyzes user expense data using Pandas (analyzer.py)
  and returns smart budget suggestions + spending summary.

Endpoints:
  POST /analyze           — Full analysis: suggestions + summary
  POST /api/analyze       — Alias (same handler) for compatibility
  POST /api/category-stats— Category aggregation stats
  GET  /health            — Liveness probe

Connected to: analyzer.py, Node.js backend dashboardController (calls via HTTP)
Owner: Python / Data Science Developer
"""

import os
from flask        import Flask, request, jsonify
from flask_cors   import CORS
from dotenv       import load_dotenv
from analyzer     import SpendingAnalyzer

# ── Load environment variables ─────────────────────────────────────────────────
load_dotenv()

app      = Flask(__name__)
analyzer = SpendingAnalyzer()

# ── CORS: allow Node.js backend and frontend origins ──────────────────────────
CORS(app, origins=[
    os.getenv("NODE_BACKEND_URL", "http://localhost:5000"),
    os.getenv("FRONTEND_URL",     "http://localhost:3000"),
    "*",  # during development; tighten in production
])


# ── Standard response helpers ─────────────────────────────────────────────────
def ok(data, message="OK", status=200):
    return jsonify({"success": True,  "data": data,  "message": message}), status

def err(message, status=400):
    return jsonify({"success": False, "data": None,  "message": message}), status


# ── GET /health ───────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """Liveness probe. Returns 200 OK if service is up."""
    return ok({"service": "FinTrack AI Service", "status": "healthy"})


# ── POST /analyze  (and alias /api/analyze) ───────────────────────────────────
@app.route("/analyze",     methods=["POST"])
@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Full spending analysis: generates AI suggestions and a summary.

    Request body:
    {
      "expenses": [
        { "amount": 1200, "category": "Food", "date": "2024-01-15",
          "paymentMethod": "UPI" }
      ],
      "budgets": {
        "Food": 3000,
        "Shopping": 5000
      }
    }

    Response:
    {
      "success": true,
      "suggestions": [...],
      "summary": {
        "total_spent": 15000,
        "top_category": "Food",
        "avg_daily_spend": 500
      }
    }
    """
    try:
        body = request.get_json(silent=True)
        if not body:
            return err("Request body must be valid JSON.")

        expenses = body.get("expenses", [])
        budgets  = body.get("budgets",  {})

        if not isinstance(expenses, list) or len(expenses) == 0:
            return err("'expenses' must be a non-empty list.")

        if not isinstance(budgets, dict):
            return err("'budgets' must be an object mapping category → limit.")

        # Run full analysis
        result = analyzer.run(expenses, budgets)

        # Return flat structure matching the spec
        return jsonify({
            "success":      True,
            "suggestions":  result["suggestions"],
            "summary":      result["summary"],
        }), 200

    except ValueError as e:
        return err(f"Invalid data: {str(e)}", status=422)
    except Exception as e:
        print(f"[/analyze] Unexpected error: {e}")
        return err("Analysis failed unexpectedly.", status=500)


# ── POST /api/category-stats ──────────────────────────────────────────────────
@app.route("/api/category-stats", methods=["POST"])
def category_stats():
    """
    Returns per-category spending stats for the given expense list.

    Request body: { "expenses": [...], "month": 4, "year": 2024 }
    """
    try:
        body = request.get_json(silent=True)
        if not body:
            return err("Request body must be valid JSON.")

        expenses = body.get("expenses", [])
        month    = body.get("month")
        year     = body.get("year")

        if not isinstance(expenses, list) or len(expenses) == 0:
            return err("'expenses' must be a non-empty list.")

        stats = analyzer.category_stats(expenses, month=month, year=year)
        return ok({"stats": stats}, "Category stats computed.")

    except Exception as e:
        print(f"[/api/category-stats] Error: {e}")
        return err("Failed to compute category stats.", status=500)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("FLASK_PORT", 8000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"🐍 FinTrack AI Service → http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
