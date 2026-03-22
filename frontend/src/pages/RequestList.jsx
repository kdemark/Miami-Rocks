import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_manager', label: 'Pending Manager' },
  { value: 'pending_finance', label: 'Pending Finance' },
  { value: 'pending_executive', label: 'Pending Executive' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RequestList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (search) params.search = search;
    api.getRequests(params)
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const pendingForMe =
    (user?.role === 'manager' && 'pending_manager') ||
    (user?.role === 'finance' && 'pending_finance') ||
    (user?.role === 'executive' && 'pending_executive');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CAPEX Requests</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {user?.role === 'requester' ? 'Your submitted requests' : 'All capital expenditure requests'}
          </p>
        </div>
        <Link to="/requests/new" className="btn-primary">+ New Request</Link>
      </div>

      {/* Quick filters for approvers */}
      {pendingForMe && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter('status', pendingForMe)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              status === pendingForMe
                ? 'bg-yellow-100 border-yellow-300 text-yellow-800 font-medium'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            ⏳ Needs My Approval
          </button>
          <button
            onClick={() => setFilter('status', '')}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              !status ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            All
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label">Search</label>
            <input
              value={search}
              onChange={e => setFilter('search', e.target.value)}
              className="form-input"
              placeholder="Search by title or description..."
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={status} onChange={e => setFilter('status', e.target.value)} className="form-select">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 font-medium">No requests found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          <Link to="/requests/new" className="btn-primary mt-4">Create a Request</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Link key={r.id} to={`/requests/${r.id}`}
              className="card hover:shadow-md transition-shadow block group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {r.title}
                    </h3>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{r.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>By {r.requester_name}</span>
                    <span>·</span>
                    <span>{r.department}</span>
                    <span>·</span>
                    <span>{r.category}</span>
                    <span>·</span>
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(r.amount)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-right">{requests.length} result{requests.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
