# CAPEX Approval Workflow System

A full-stack Capital Expenditure (CAPEX) approval workflow, budgeting system, and end-user request form.

## Features

### End User Request Form
- Rich CAPEX request form with title, description, amount, category, and priority
- Business justification, business case, ROI, and vendor fields
- Save as draft or submit directly for approval
- Edit drafts before submission

### Multi-Level Approval Workflow
- **Manager** → reviews and approves/rejects from their department
- **Finance** → reviews budget impact and financial feasibility
- **Executive** → final approval for requests ≥ $50,000
- Full audit trail with comments at every approval step
- Real-time status tracking

### Budgeting System
- Department budgets by fiscal year and category
- Track total, allocated, and spent amounts
- Visual progress bars with utilization warnings
- Finance/Admin roles can update budget figures

### Dashboard
- Role-specific views and pending approval counts
- Budget utilization overview
- Request trend and category breakdowns
- Quick action shortcuts

## Demo Accounts
All accounts use password: `password123`

| Role       | Email                  | Department  |
|------------|------------------------|-------------|
| Requester  | alice@company.com      | Engineering |
| Requester  | bob@company.com        | Marketing   |
| Manager    | carol@company.com      | Engineering |
| Manager    | david@company.com      | Marketing   |
| Finance    | emma@company.com       | Finance     |
| Executive  | frank@company.com      | Executive   |
| Admin      | admin@company.com      | IT          |

## Tech Stack
- **Backend**: Node.js, Express, SQLite (better-sqlite3), JWT auth
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6

## Setup & Running

### Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Run backend (port 3001)
```bash
cd backend && npm run dev
```

### Run frontend (port 5173)
```bash
cd frontend && npm run dev
```

Then open http://localhost:5173

## Approval Workflow

```
Requester submits
       ↓
  Manager Review  ──reject──→ Rejected
       ↓ approve
  Finance Review  ──reject──→ Rejected
       ↓ approve
  (if amount ≥ $50,000)
  Executive Approval ──reject──→ Rejected
       ↓ approve
    APPROVED ✅
```
