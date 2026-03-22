const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'capex.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('requester','manager','finance','executive','admin')),
    department TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS capex_requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    justification TEXT NOT NULL,
    business_case TEXT,
    vendor TEXT,
    expected_roi TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
    department TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
      'draft','pending_manager','pending_finance','pending_executive','approved','rejected','cancelled'
    )),
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (requester_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS approval_actions (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    approver_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('submitted','approved','rejected','info_requested')),
    step TEXT NOT NULL CHECK(step IN ('submission','manager','finance','executive')),
    comments TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (request_id) REFERENCES capex_requests(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    allocated_amount REAL NOT NULL DEFAULT 0,
    spent_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(department, fiscal_year, category)
  );
`);

// Seed demo data if empty
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = (p) => bcrypt.hashSync(p, 10);
  const { v4: uuidv4 } = require('uuid');

  const users = [
    { id: uuidv4(), name: 'Alice Johnson', email: 'alice@company.com', password: hash('password123'), role: 'requester', department: 'Engineering' },
    { id: uuidv4(), name: 'Bob Martinez', email: 'bob@company.com', password: hash('password123'), role: 'requester', department: 'Marketing' },
    { id: uuidv4(), name: 'Carol Williams', email: 'carol@company.com', password: hash('password123'), role: 'manager', department: 'Engineering' },
    { id: uuidv4(), name: 'David Chen', email: 'david@company.com', password: hash('password123'), role: 'manager', department: 'Marketing' },
    { id: uuidv4(), name: 'Emma Thompson', email: 'emma@company.com', password: hash('password123'), role: 'finance', department: 'Finance' },
    { id: uuidv4(), name: 'Frank Rivera', email: 'frank@company.com', password: hash('password123'), role: 'executive', department: 'Executive' },
    { id: uuidv4(), name: 'Admin User', email: 'admin@company.com', password: hash('password123'), role: 'admin', department: 'IT' },
  ];

  const insertUser = db.prepare('INSERT INTO users (id,name,email,password,role,department) VALUES (?,?,?,?,?,?)');
  users.forEach(u => insertUser.run(u.id, u.name, u.email, u.password, u.role, u.department));

  // Seed budgets
  const currentYear = new Date().getFullYear();
  const departments = ['Engineering', 'Marketing', 'Finance', 'Operations', 'IT'];
  const categories = ['IT Equipment', 'Software/Licenses', 'Office Equipment', 'Vehicles', 'Machinery', 'Infrastructure'];
  const insertBudget = db.prepare(`
    INSERT OR IGNORE INTO budgets (id,department,fiscal_year,category,total_amount,allocated_amount,spent_amount)
    VALUES (?,?,?,?,?,?,?)
  `);
  departments.forEach(dept => {
    categories.forEach(cat => {
      const total = Math.floor(Math.random() * 200000 + 50000);
      const allocated = Math.floor(total * Math.random() * 0.6);
      const spent = Math.floor(allocated * Math.random() * 0.7);
      insertBudget.run(uuidv4(), dept, currentYear, cat, total, allocated, spent);
    });
  });

  console.log('Database seeded with demo data');
  console.log('Demo accounts (all use password: password123):');
  users.forEach(u => console.log(`  ${u.role.padEnd(12)} ${u.email}`));
}

module.exports = db;
