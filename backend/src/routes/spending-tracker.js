const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { user } = req;
  const year = parseInt(req.query.fiscal_year) || new Date().getFullYear();
  const department = req.query.department || null;

  // Determine department scope
  let deptFilter = '';
  const deptParams = [];
  if (department) {
    deptFilter = ' AND department=?';
    deptParams.push(department);
  } else if (user.role === 'manager') {
    deptFilter = ' AND department=?';
    deptParams.push(user.department);
  } else if (user.role === 'requester') {
    deptFilter = ' AND requester_id=?';
    deptParams.push(user.id);
  }

  // Total budget for the fiscal year
  let budgetQuery = 'SELECT COALESCE(SUM(total_amount),0) as total_budget, COALESCE(SUM(spent_amount),0) as total_spent FROM budgets WHERE fiscal_year=?';
  const budgetParams = [year];
  if (department) {
    budgetQuery += ' AND department=?';
    budgetParams.push(department);
  } else if (user.role === 'manager') {
    budgetQuery += ' AND department=?';
    budgetParams.push(user.department);
  }
  const budgetRow = db.prepare(budgetQuery).get(...budgetParams);
  const totalBudget = budgetRow.total_budget || 0;
  const totalSpent = budgetRow.total_spent || 0;

  // All approved requests in the fiscal year, with approver info
  // Use the latest approval_action timestamp for approved requests as the approval date
  const approvedQuery = `
    SELECT
      r.id,
      r.title,
      r.amount,
      r.department,
      r.category,
      r.priority,
      r.updated_at,
      u.name as requester_name,
      COALESCE(
        (SELECT aa.created_at FROM approval_actions aa
         WHERE aa.request_id = r.id AND aa.action = 'approved'
         ORDER BY aa.created_at DESC LIMIT 1),
        r.updated_at
      ) as approved_at
    FROM capex_requests r
    JOIN users u ON r.requester_id = u.id
    WHERE r.status = 'approved'
      AND strftime('%Y', r.updated_at) = ?
      ${deptFilter}
    ORDER BY approved_at ASC, r.updated_at ASC
  `;
  const approved = db.prepare(approvedQuery).all(String(year), ...deptParams);

  // Build declining balance timeline
  let runningBalance = totalBudget;
  const transactions = approved.map(r => {
    runningBalance -= r.amount;
    return {
      id: r.id,
      title: r.title,
      amount: r.amount,
      department: r.department,
      category: r.category,
      priority: r.priority,
      approved_at: r.approved_at,
      requester_name: r.requester_name,
      balance_after: runningBalance,
    };
  });

  const totalApproved = approved.reduce((sum, r) => sum + r.amount, 0);
  const currentBalance = totalBudget - totalApproved;

  // Monthly burn: group approved amounts by month
  const monthlyMap = {};
  approved.forEach(r => {
    const month = r.approved_at ? r.approved_at.substring(0, 7) : null;
    if (!month) return;
    if (!monthlyMap[month]) monthlyMap[month] = { month, approved: 0, count: 0 };
    monthlyMap[month].approved += r.amount;
    monthlyMap[month].count += 1;
  });
  const monthlyBurn = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Compute average monthly burn rate (over months with spend)
  const monthsWithBurn = monthlyBurn.filter(m => m.approved > 0);
  const avgMonthlyBurn = monthsWithBurn.length > 0
    ? monthsWithBurn.reduce((s, m) => s + m.approved, 0) / monthsWithBurn.length
    : 0;

  // Project exhaustion date
  let projectedExhaustionDate = null;
  if (avgMonthlyBurn > 0 && currentBalance > 0) {
    const monthsLeft = Math.ceil(currentBalance / avgMonthlyBurn);
    const now = new Date();
    const exhaustion = new Date(now.getFullYear(), now.getMonth() + monthsLeft, 1);
    projectedExhaustionDate = exhaustion.toISOString().substring(0, 7);
  } else if (currentBalance <= 0) {
    projectedExhaustionDate = 'exhausted';
  }

  // Build a month-by-month balance series starting from Jan of fiscal year
  // for the chart (showing balance at end of each month)
  const balanceSeries = [];
  let balance = totalBudget;
  const today = new Date();
  const lastMonth = year < today.getFullYear()
    ? 12
    : year > today.getFullYear()
    ? 0
    : today.getMonth() + 1; // 1-12

  for (let m = 1; m <= lastMonth; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const spent = monthlyMap[monthStr] ? monthlyMap[monthStr].approved : 0;
    balance -= spent;
    balanceSeries.push({ month: monthStr, balance, spent });
  }

  // Available departments for filter
  const depts = db.prepare('SELECT DISTINCT department FROM budgets ORDER BY department').all().map(r => r.department);

  res.json({
    fiscalYear: year,
    totalBudget,
    totalApproved,
    totalSpent,
    currentBalance,
    avgMonthlyBurn,
    projectedExhaustionDate,
    transactions,
    monthlyBurn,
    balanceSeries,
    departments: depts,
  });
});

module.exports = router;
