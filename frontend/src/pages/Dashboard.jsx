import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(n) {
  if (!n) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function BudgetBar({ label, allocated, total }) {
  const pct = total > 0 ? Math.min(100, (allocated / total) * 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{Math.round(pct)}% used</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{formatCurrency(allocated)} allocated</span>
        <span>{formatCurrency(total)} total</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getBudgetSummary()])
      .then(([dash, budgets]) => {
        setData(dash);
        setBudgetSummary(budgets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const sc = data?.statusCounts || {};
  const total = Object.values(sc).reduce((a, b) => a + b, 0);
  const pending = (sc.pending_manager || 0) + (sc.pending_finance || 0) + (sc.pending_executive || 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role === 'requester' ? 'Track your CAPEX requests and their approval status.' :
           user?.role === 'manager' ? `Review and approve CAPEX requests from your team.` :
           user?.role === 'finance' ? 'Review financial impact of CAPEX requests.' :
           user?.role === 'executive' ? 'Final approval for high-value CAPEX requests.' :
           'System overview and administration.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Requests" value={total} icon="📋" color="blue" />
        <StatCard label="Pending Approval" value={pending} icon="⏳" color="yellow"
          sub={data?.pendingApproval > 0 ? `${data.pendingApproval} need your action` : undefined} />
        <StatCard label="Approved" value={sc.approved || 0} icon="✅" color="green"
          sub={formatCurrency(data?.approvedTotal)} />
        <StatCard label="Rejected" value={sc.rejected || 0} icon="❌" color="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Recent requests */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Requests</h2>
            <Link to="/requests" className="text-sm text-blue-600 hover:underline">View all →</Link>
          </div>
          {data?.recentRequests?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">No requests yet</p>
              <Link to="/requests/new" className="btn-primary mt-3 text-xs">Create your first request</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentRequests?.map(r => (
                <Link key={r.id} to={`/requests/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.requester_name} · {r.department}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.amount)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions needed */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/requests/new" className="btn-primary w-full">
              + New CAPEX Request
            </Link>
            {data?.pendingApproval > 0 && (
              <Link
                to={`/requests?status=${
                  user?.role === 'manager' ? 'pending_manager' :
                  user?.role === 'finance' ? 'pending_finance' : 'pending_executive'
                }`}
                className="btn-secondary w-full relative"
              >
                Review {data.pendingApproval} Pending
                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {data.pendingApproval}
                </span>
              </Link>
            )}
            {user?.role !== 'requester' && (
              <Link to="/budgets" className="btn-secondary w-full">
                View Budget Status
              </Link>
            )}
          </div>

          {/* Status breakdown */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(sc).filter(([, v]) => v > 0).map(([s, v]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s} />
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget overview */}
      {user?.role !== 'requester' && budgetSummary.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Budget Overview — {new Date().getFullYear()}</h2>
            <Link to="/budgets" className="text-sm text-blue-600 hover:underline">Manage →</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetSummary.map(b => (
              <BudgetBar key={b.department} label={b.department}
                allocated={b.total_allocated} total={b.total_budget} />
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {data?.byCategory?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold text-gray-900 mb-4">Requests by Category</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.byCategory.slice(0, 6).map(c => (
              <div key={c.category} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{c.category}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(c.total_amount)}</p>
                <p className="text-xs text-gray-500">{c.count} request{c.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
