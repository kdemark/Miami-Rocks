const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all budgets
router.get('/', authenticate, (req, res) => {
  const { department, fiscal_year } = req.query;
  let query = 'SELECT * FROM budgets WHERE 1=1';
  const params = [];

  if (department) { query += ' AND department=?'; params.push(department); }
  if (fiscal_year) { query += ' AND fiscal_year=?'; params.push(Number(fiscal_year)); }

  query += ' ORDER BY department, category';
  res.json(db.prepare(query).all(...params));
});

// Get budget summary by department
router.get('/summary', authenticate, (req, res) => {
  const { fiscal_year } = req.query;
  const year = fiscal_year ? Number(fiscal_year) : new Date().getFullYear();

  const summary = db.prepare(`
    SELECT department,
      SUM(total_amount) as total_budget,
      SUM(allocated_amount) as total_allocated,
      SUM(spent_amount) as total_spent,
      SUM(total_amount) - SUM(allocated_amount) as available
    FROM budgets
    WHERE fiscal_year = ?
    GROUP BY department
    ORDER BY department
  `).all(year);

  res.json(summary);
});

// Create or update budget
router.put('/:department/:year/:category', authenticate, requireRole('finance', 'admin'), (req, res) => {
  const { department, year, category } = req.params;
  const { total_amount, spent_amount } = req.body;

  if (total_amount === undefined) return res.status(400).json({ error: 'total_amount required' });

  const existing = db.prepare('SELECT * FROM budgets WHERE department=? AND fiscal_year=? AND category=?')
    .get(department, Number(year), category);

  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE budgets SET total_amount=?, spent_amount=COALESCE(?,spent_amount), updated_at=?
      WHERE department=? AND fiscal_year=? AND category=?
    `).run(Number(total_amount), spent_amount !== undefined ? Number(spent_amount) : null, now, department, Number(year), category);
  } else {
    db.prepare(`
      INSERT INTO budgets (id,department,fiscal_year,category,total_amount,allocated_amount,spent_amount,created_at,updated_at)
      VALUES (?,?,?,?,?,0,?,?,?)
    `).run(uuidv4(), department, Number(year), category, Number(total_amount), spent_amount !== undefined ? Number(spent_amount) : 0, now, now);
  }

  res.json(db.prepare('SELECT * FROM budgets WHERE department=? AND fiscal_year=? AND category=?')
    .get(department, Number(year), category));
});

module.exports = router;
