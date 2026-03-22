const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { user } = req;
  const year = new Date().getFullYear();

  // Request counts by status
  let statusQuery = 'SELECT status, COUNT(*) as count FROM capex_requests WHERE 1=1';
  const params = [];

  if (user.role === 'requester') {
    statusQuery += ' AND requester_id=?';
    params.push(user.id);
  } else if (user.role === 'manager') {
    statusQuery += ' AND department=?';
    params.push(user.department);
  }
  statusQuery += ' GROUP BY status';

  const statusCounts = db.prepare(statusQuery).all(...params);
  const countMap = {};
  statusCounts.forEach(r => { countMap[r.status] = r.count; });

  // Pending approval for current user
  let pendingApproval = 0;
  if (user.role === 'manager') {
    pendingApproval = db.prepare("SELECT COUNT(*) as c FROM capex_requests WHERE status='pending_manager'").get().c;
  } else if (user.role === 'finance') {
    pendingApproval = db.prepare("SELECT COUNT(*) as c FROM capex_requests WHERE status='pending_finance'").get().c;
  } else if (user.role === 'executive') {
    pendingApproval = db.prepare("SELECT COUNT(*) as c FROM capex_requests WHERE status='pending_executive'").get().c;
  }

  // Budget overview
  const budgetSummary = db.prepare(`
    SELECT SUM(total_amount) as total_budget, SUM(allocated_amount) as total_allocated,
           SUM(spent_amount) as total_spent
    FROM budgets WHERE fiscal_year=?
  `).get(year);

  // Total approved value
  let approvedQuery = 'SELECT COALESCE(SUM(amount),0) as total FROM capex_requests WHERE status=?';
  const approvedParams = ['approved'];
  if (user.role === 'requester') {
    approvedQuery += ' AND requester_id=?';
    approvedParams.push(user.id);
  }
  const approvedTotal = db.prepare(approvedQuery).get(...approvedParams).total;

  // Recent requests
  let recentQuery = `
    SELECT r.id, r.title, r.amount, r.status, r.created_at, r.department, u.name as requester_name
    FROM capex_requests r JOIN users u ON r.requester_id=u.id
    WHERE 1=1
  `;
  const recentParams = [];
  if (user.role === 'requester') {
    recentQuery += ' AND r.requester_id=?';
    recentParams.push(user.id);
  } else if (user.role === 'manager') {
    recentQuery += ' AND r.department=?';
    recentParams.push(user.department);
  }
  recentQuery += ' ORDER BY r.created_at DESC LIMIT 5';
  const recentRequests = db.prepare(recentQuery).all(...recentParams);

  // Monthly request trend (last 6 months)
  const trend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(amount) as total_amount
    FROM capex_requests
    WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  // Requests by category
  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(amount) as total_amount
    FROM capex_requests
    WHERE status NOT IN ('draft','cancelled')
    GROUP BY category ORDER BY total_amount DESC
  `).all();

  res.json({
    statusCounts: countMap,
    pendingApproval,
    budgetSummary,
    approvedTotal,
    recentRequests,
    trend,
    byCategory,
  });
});

module.exports = router;
