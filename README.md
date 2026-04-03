# FinTrack — Personal Finance Tracker+ 💰

```
███████╗██╗███╗   ██╗████████╗██████╗  █████╗  ██████╗██╗  ██╗
██╔════╝██║████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
█████╗  ██║██╔██╗ ██║   ██║   ██████╔╝███████║██║     █████╔╝
██╔══╝  ██║██║╚██╗██║   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗
██║     ██║██║ ╚████║   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗
╚═╝     ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
```

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Python](https://img.shields.io/badge/Python-3.11-yellow?logo=python)
![License](https://img.shields.io/badge/License-MIT-purple)

FinTrack is a **production-grade personal finance tracker** with AI-powered spending insights. It connects to your expense data, visualizes spending patterns with interactive charts, enforces monthly budgets with real-time alerts, and provides personalized AI suggestions to help you save more — powered by a dedicated Python microservice.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Secure register/login with bcrypt hashing and role-based access |
| 💳 **Expense Management** | Full CRUD with category filters, date range, debounced search, pagination |
| 📊 **Interactive Charts** | Pie (category), Line (daily trend), Bar (monthly comparison) via Recharts |
| 💰 **Budget System** | Per-category monthly limits with real-time 80%/100% threshold alerts |
| 📅 **Monthly Reports** | Pre-aggregated SQLite reports with category breakdown and savings rate |
| 🤖 **AI Suggestions** | Python/Pandas microservice with 6 rule-based spending insights |
| 🔁 **Recurring Expenses** | Mark expenses as recurring; auto-added monthly via cron job |
| 👑 **Admin Dashboard** | Platform-wide analytics and user activity table |
| 📤 **CSV Export** | Download all expenses or current month as CSV |
| ⚙️ **Settings** | Profile, preferences, notifications, data export, danger zone |
| 📱 **Mobile Responsive** | Bottom tab bar on mobile, fluid layouts, bottom-sheet modals |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| **Charts** | Recharts (Pie, Line, Bar, Area with custom shapes) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Auth** | JWT + bcrypt, express-rate-limit, Helmet |
| **Primary DB** | MongoDB Atlas (Mongoose ODM) |
| **Reports DB** | SQLite via Sequelize ORM |
| **AI Service** | Python 3.11, Flask, Pandas, NumPy |
| **Scheduling** | node-cron (monthly reports + recurring expenses) |
| **Deployment** | Vercel (frontend), Render (backend), Railway (Python) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier works)
- npm or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/fintrack.git
cd fintrack
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Install additional required packages
npm install node-cron @types/node-cron sequelize sequelize-typescript sqlite3 date-fns

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start in development mode
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Install chart and UI dependencies
npm install recharts date-fns sonner lucide-react

# Copy and configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your API URLs

# Start in development mode
npm run dev
```

Frontend will be available at: **http://localhost:3000**

### 4. Python Service Setup

```bash
cd python-service

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install flask flask-cors pandas numpy python-dotenv

# Copy and configure environment variables
cp .env.example .env

# Start the service
python app.py
```

Python service will run on: **http://localhost:8000**

### 5. Environment Variable Setup

| File | Source |
|------|--------|
| `backend/.env` | Copy from `backend/.env.example` |
| `frontend/.env.local` | Copy from `frontend/.env.local.example` |
| `python-service/.env` | Copy from `python-service/.env.example` |

**Key variables to configure:**

| Variable | Where | Description |
|----------|-------|-------------|
| `MONGODB_URI` | backend | MongoDB Atlas connection string |
| `JWT_SECRET` | backend | Random 32+ char string |
| `NEXT_PUBLIC_API_URL` | frontend | Backend URL (default: http://localhost:5000/api) |
| `NEXT_PUBLIC_PYTHON_API_URL` | frontend | Python service URL |

---

## 🔑 Test Credentials

After seeding the database (or registering manually):

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@fintrack.com | Admin@123 |
| **Demo User** | demo@fintrack.com | Demo@123 |

---

## 📡 API Endpoints Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| PATCH | `/api/auth/me` | ✅ | Update profile |

### Expense Routes — `/api/expenses`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/expenses` | ✅ | List expenses (paginated, filterable) |
| POST | `/api/expenses` | ✅ | Create expense |
| PUT | `/api/expenses/:id` | ✅ | Update expense |
| DELETE | `/api/expenses/:id` | ✅ | Delete expense |
| GET | `/api/expenses/export` | ✅ | Export expenses as CSV |

### Budget Routes — `/api/budgets`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/budgets` | ✅ | Get all budgets (current month) |
| POST | `/api/budgets` | ✅ | Set/update a budget (upsert) |
| DELETE | `/api/budgets/:id` | ✅ | Remove a budget |
| GET | `/api/budgets/status` | ✅ | Get real-time spend vs budget status |

### Dashboard Routes — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/summary` | ✅ | KPI summary (total spent, top category) |
| GET | `/api/dashboard/category-breakdown` | ✅ | Pie chart data |
| GET | `/api/dashboard/spending-trend` | ✅ | Daily spend for last 30 days |
| GET | `/api/dashboard/monthly-comparison` | ✅ | Last 6 months bar chart data |

### Report Routes — `/api/reports`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports` | ✅ | Last 3 monthly reports (SQLite) |
| GET | `/api/reports/:month` | ✅ | Specific month report (YYYY-MM) |
| POST | `/api/reports/generate` | ✅ | Manually generate a report |
| GET | `/api/reports/admin/all` | ✅ 👑 | All users' reports (admin only) |

### Python AI Routes — `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/analyze` | Generate AI suggestions |
| POST | `/api/category-stats` | Category aggregation stats |

---

## 🚢 Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set root directory to `frontend/`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com/api`
   - `NEXT_PUBLIC_PYTHON_API_URL` = `https://your-python.railway.app`
5. Deploy

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub → Select your repo
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/app.js`
4. Add environment variables (all from `backend/.env.example`)
5. Deploy

### Python Service → Railway

1. Go to [railway.app](https://railway.app) → New Project → GitHub Repo
2. Select your repo → Add service
3. Set:
   - **Root Directory**: `python-service`
   - **Start Command**: `python app.py`
4. Add environment variables:
   - `FLASK_ENV=production`
   - `NODE_BACKEND_URL=https://your-backend.onrender.com`
   - `FRONTEND_URL=https://your-app.vercel.app`
5. Deploy

---

## 📸 Screenshots

> _Add screenshots here after deploying_

| Dashboard | Expenses | Budget | Reports |
|-----------|----------|--------|---------|
| ![Dashboard](./screenshots/dashboard.png) | ![Expenses](./screenshots/expenses.png) | ![Budget](./screenshots/budget.png) | ![Reports](./screenshots/reports.png) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the existing code style — every file must have its top-level comment block.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ using Next.js, Express, MongoDB, and Python</p>
