import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  'IT Equipment',
  'Software/Licenses',
  'Office Equipment',
  'Vehicles',
  'Machinery',
  'Infrastructure',
  'Other',
];

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function pct(a, b) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

function ProgressBar({ value, max, colorClass = 'bg-blue-500' }) {
  const p = pct(value, max);
  const color = p > 90 ? 'bg-red-500' : p > 70 ? 'bg-yellow-500' : colorClass;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function EditBudgetModal({ budget, onClose, onSave }) {
  const [totalAmount, setTotalAmount] = useState(String(budget.total_amount));
  const [spentAmount, setSpentAmount] = useState(String(budget.spent_amount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!totalAmount || isNaN(Number(totalAmount))) { setError('Valid amount required'); return; }
    setLoading(true);
    try {
      await onSave(budget.department, budget.fiscal_year, budget.category, {
        total_amount: Number(totalAmount),
        spent_amount: Number(spentAmount) || 0,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Budget</h3>
        <p className="text-sm text-gray-500 mb-4">
          {budget.department} · {budget.category} · FY{budget.fiscal_year}
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Total Budget (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
              <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                className="form-input pl-7" min="0" />
            </div>
          </div>
          <div>
            <label className="form-label">Amount Spent (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
              <input type="number" value={spentAmount} onChange={e => setSpentAmount(e.target.value)}
                className="form-input pl-7" min="0" />
            </div>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetManagement() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedDept, setSelectedDept] = useState('');
  const [editBudget, setEditBudget] = useState(null);
  const canEdit = user?.role === 'finance' || user?.role === 'admin';

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1].map(String);

  useEffect(() => {
    setLoading(true);
    const params = { fiscal_year: selectedYear };
    if (selectedDept) params.department = selectedDept;
    Promise.all([api.getBudgets(params), api.getBudgetSummary(selectedYear)])
      .then(([b, s]) => { setBudgets(b); setSummary(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear, selectedDept]);

  const handleSave = async (dept, year, cat, data) => {
    await api.updateBudget(dept, year, cat, data);
    const params = { fiscal_year: selectedYear };
    if (selectedDept) params.department = selectedDept;
    const [b, s] = await Promise.all([api.getBudgets(params), api.getBudgetSummary(selectedYear)]);
    setBudgets(b);
    setSummary(s);
  };

  const departments = [...new Set(budgets.map(b => b.department))].sort();

  // Group budgets by department
  const byDept = {};
  budgets.forEach(b => {
    if (!byDept[b.department]) byDept[b.department] = [];
    byDept[b.department].push(b);
  });

  const totalBudget = summary.reduce((sum, s) => sum + (s.total_budget || 0), 0);
  const totalAllocated = summary.reduce((sum, s) => sum + (s.total_allocated || 0), 0);
  const totalSpent = summary.reduce((sum, s) => sum + (s.total_spent || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage capital expenditure budgets by department and category.
          {canEdit && ' Finance and Admin roles can edit budgets.'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
          <p className="text-xs text-gray-400">FY{selectedYear}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Allocated</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAllocated)}</p>
          <p className="text-xs text-gray-400">{pct(totalAllocated, totalBudget)}% of budget</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Spent</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-gray-400">{pct(totalSpent, totalBudget)}% of budget</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label">Fiscal Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="form-select">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="form-select">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Department summary */}
      {!selectedDept && summary.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Department Overview — FY{selectedYear}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4 text-right">Total Budget</th>
                  <th className="pb-2 pr-4 text-right">Allocated</th>
                  <th className="pb-2 pr-4 text-right">Spent</th>
                  <th className="pb-2 text-right">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map(s => (
                  <tr key={s.department}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{s.department}</td>
                    <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(s.total_budget)}</td>
                    <td className="py-3 pr-4 text-right text-blue-600">{formatCurrency(s.total_allocated)}</td>
                    <td className="py-3 pr-4 text-right text-green-600">{formatCurrency(s.total_spent)}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(s.available)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget detail by department */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDept).map(([dept, items]) => (
            <div key={dept} className="card">
              <h3 className="font-semibold text-gray-900 text-base mb-4">{dept}</h3>
              <div className="space-y-4">
                {items.map(b => (
                  <div key={b.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{b.category}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatCurrency(b.allocated_amount)} allocated · {formatCurrency(b.spent_amount)} spent
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{formatCurrency(b.total_amount)}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(b.total_amount - b.allocated_amount)} available
                        </p>
                        {canEdit && (
                          <button onClick={() => setEditBudget(b)}
                            className="mt-1 text-xs text-blue-600 hover:underline">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Allocated</span>
                          <span>{pct(b.allocated_amount, b.total_amount)}%</span>
                        </div>
                        <ProgressBar value={b.allocated_amount} max={b.total_amount} colorClass="bg-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Spent</span>
                          <span>{pct(b.spent_amount, b.total_amount)}%</span>
                        </div>
                        <ProgressBar value={b.spent_amount} max={b.total_amount} colorClass="bg-green-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editBudget && (
        <EditBudgetModal
          budget={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
