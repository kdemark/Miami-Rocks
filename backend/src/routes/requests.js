const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const EXECUTIVE_THRESHOLD = 50000;

// Get all requests (filtered by role)
router.get('/', authenticate, (req, res) => {
  const { user } = req;
  const { status, department, search } = req.query;

  let query = `
    SELECT r.*, u.name as requester_name, u.email as requester_email
    FROM capex_requests r
    JOIN users u ON r.requester_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role === 'requester') {
    query += ' AND r.requester_id = ?';
    params.push(user.id);
  } else if (user.role === 'manager') {
    query += ' AND (r.requester_id = ? OR r.status IN (?,?,?,?,?))';
    params.push(user.id, 'pending_manager', 'pending_finance', 'pending_executive', 'approved', 'rejected');
  }
  // finance, executive, admin see all

  if (status) { query += ' AND r.status = ?'; params.push(status); }
  if (department) { query += ' AND r.department = ?'; params.push(department); }
  if (search) { query += ' AND (r.title LIKE ? OR r.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY r.created_at DESC';

  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

// Get single request with approval history
router.get('/:id', authenticate, (req, res) => {
  const request = db.prepare(`
    SELECT r.*, u.name as requester_name, u.email as requester_email
    FROM capex_requests r
    JOIN users u ON r.requester_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });

  const actions = db.prepare(`
    SELECT a.*, u.name as approver_name, u.role as approver_role
    FROM approval_actions a
    JOIN users u ON a.approver_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.created_at ASC
  `).all(req.params.id);

  res.json({ ...request, actions });
});

// Create new CAPEX request
router.post('/', authenticate, (req, res) => {
  const { title, description, amount, category, justification, business_case, vendor, expected_roi, priority } = req.body;

  if (!title || !description || !amount || !category || !justification) {
    return res.status(400).json({ error: 'Required fields: title, description, amount, category, justification' });
  }
  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO capex_requests (id,title,description,amount,category,justification,business_case,vendor,expected_roi,priority,department,requester_id,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)
  `).run(id, title, description, Number(amount), category, justification, business_case || null, vendor || null, expected_roi || null, priority || 'medium', req.user.department, req.user.id, now, now);

  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(id);
  res.status(201).json(request);
});

// Submit request (draft → pending_manager)
router.post('/:id/submit', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.requester_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (request.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft requests can be submitted' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE capex_requests SET status='pending_manager', updated_at=? WHERE id=?").run(now, request.id);
  db.prepare(`INSERT INTO approval_actions (id,request_id,approver_id,action,step,comments,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(uuidv4(), request.id, req.user.id, 'submitted', 'submission', req.body.comments || null, now);

  res.json(db.prepare('SELECT * FROM capex_requests WHERE id=?').get(request.id));
});

// Approve request
router.post('/:id/approve', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const { user } = req;
  const { comments } = req.body;
  const now = new Date().toISOString();

  let nextStatus, step;

  if (request.status === 'pending_manager' && (user.role === 'manager' || user.role === 'admin')) {
    step = 'manager';
    nextStatus = 'pending_finance';
  } else if (request.status === 'pending_finance' && (user.role === 'finance' || user.role === 'admin')) {
    step = 'finance';
    nextStatus = request.amount >= EXECUTIVE_THRESHOLD ? 'pending_executive' : 'approved';
  } else if (request.status === 'pending_executive' && (user.role === 'executive' || user.role === 'admin')) {
    step = 'executive';
    nextStatus = 'approved';
  } else {
    return res.status(403).json({ error: 'You are not authorized to approve this request at its current stage' });
  }

  db.prepare("UPDATE capex_requests SET status=?, updated_at=? WHERE id=?").run(nextStatus, now, request.id);
  db.prepare(`INSERT INTO approval_actions (id,request_id,approver_id,action,step,comments,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(uuidv4(), request.id, user.id, 'approved', step, comments || null, now);

  // If approved, check budget availability then allocate
  if (nextStatus === 'approved') {
    const fiscalYear = new Date().getFullYear();
    const budget = db.prepare(
      'SELECT * FROM budgets WHERE department=? AND fiscal_year=? AND category=?'
    ).get(request.department, fiscalYear, request.category);

    if (budget && (budget.allocated_amount + request.amount) > budget.total_amount) {
      return res.status(422).json({
        error: `Insufficient budget: ${request.department} / ${request.category} has $${(budget.total_amount - budget.allocated_amount).toLocaleString()} remaining but this request requires $${request.amount.toLocaleString()}`
      });
    }

    db.prepare(`
      UPDATE budgets SET allocated_amount = allocated_amount + ?, updated_at = ?
      WHERE department=? AND fiscal_year=? AND category=?
    `).run(request.amount, now, request.department, fiscalYear, request.category);
  }

  res.json(db.prepare('SELECT * FROM capex_requests WHERE id=?').get(request.id));
});

// Reject request
router.post('/:id/reject', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const { user } = req;
  const { comments } = req.body;
  if (!comments) return res.status(400).json({ error: 'Rejection reason is required' });

  const allowedStatuses = {
    manager: 'pending_manager',
    finance: 'pending_finance',
    executive: 'pending_executive',
    admin: null,
  };

  const inPendingState = ['pending_manager', 'pending_finance', 'pending_executive'].includes(request.status);
  const canReject = user.role === 'admin' || (allowedStatuses[user.role] === request.status);

  if (!inPendingState || !canReject) {
    return res.status(403).json({ error: 'You are not authorized to reject this request at its current stage' });
  }

  const stepMap = {
    pending_manager: 'manager',
    pending_finance: 'finance',
    pending_executive: 'executive',
  };
  const step = user.role === 'admin' ? (stepMap[request.status] || 'manager') : stepMap[request.status];
  const now = new Date().toISOString();

  db.prepare("UPDATE capex_requests SET status='rejected', rejection_reason=?, updated_at=? WHERE id=?")
    .run(comments, now, request.id);
  db.prepare(`INSERT INTO approval_actions (id,request_id,approver_id,action,step,comments,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(uuidv4(), request.id, user.id, 'rejected', step, comments, now);

  res.json(db.prepare('SELECT * FROM capex_requests WHERE id=?').get(request.id));
});

// Cancel request (requester only, while in draft or pending_manager)
router.post('/:id/cancel', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.requester_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (!['draft', 'pending_manager'].includes(request.status)) {
    return res.status(400).json({ error: 'Cannot cancel request at this stage' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE capex_requests SET status='cancelled', updated_at=? WHERE id=?").run(now, request.id);
  res.json(db.prepare('SELECT * FROM capex_requests WHERE id=?').get(request.id));
});

// Update draft request
router.put('/:id', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM capex_requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.requester_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (request.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft requests can be edited' });
  }

  const { title, description, amount, category, justification, business_case, vendor, expected_roi, priority } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE capex_requests SET title=?,description=?,amount=?,category=?,justification=?,
    business_case=?,vendor=?,expected_roi=?,priority=?,updated_at=? WHERE id=?
  `).run(
    title || request.title,
    description || request.description,
    amount !== undefined ? Number(amount) : request.amount,
    category || request.category,
    justification || request.justification,
    business_case !== undefined ? business_case : request.business_case,
    vendor !== undefined ? vendor : request.vendor,
    expected_roi !== undefined ? expected_roi : request.expected_roi,
    priority || request.priority,
    now, request.id
  );

  res.json(db.prepare('SELECT * FROM capex_requests WHERE id=?').get(request.id));
});

module.exports = router;
