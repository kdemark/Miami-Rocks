import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function pct(a, b) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

function fmtMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// SVG declining balance chart
function BalanceChart({ balanceSeries, totalBudget, projectedExhaustionDate, avgMonthlyBurn }) {
  if (!balanceSeries || balanceSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No spending data for this period
      </div>
    );
  }

  const W = 700;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 40, left: 72 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Data points: start at totalBudget, then each month end-balance
  const points = [
    { month: balanceSeries[0].month.substring(0, 4) + '-00', balance: totalBudget },
    ...balanceSeries,
  ];

  // Add projection points if we have a burn rate and budget remaining
  const projPoints = [];
  const lastPoint = points[points.length - 1];
  if (avgMonthlyBurn > 0 && lastPoint.balance > 0 && projectedExhaustionDate && projectedExhaustionDate !== 'exhausted') {
    // Add 1-2 projection months
    const [ey, em] = projectedExhaustionDate.split('-').map(Number);
    const [ly, lm] = lastPoint.month.split('-').map(Number);
    // Project up to exhaustion (max 3 extra points)
    let cy = ly, cm = lm, cb = lastPoint.balance;
    for (let i = 0; i < 4 && cb > 0; i++) {
      cm++;
      if (cm > 12) { cm = 1; cy++; }
      cb = Math.max(0, cb - avgMonthlyBurn);
      projPoints.push({ month: `${cy}-${String(cm).padStart(2, '0')}`, balance: cb, projected: true });
      if (cy > ey || (cy === ey && cm >= em)) break;
    }
  }

  const allPoints = [...points, ...projPoints];
  const n = allPoints.length;
  const maxBal = Math.max(totalBudget, ...allPoints.map(p => p.balance));
  const minBal = Math.min(0, ...allPoints.map(p => p.balance));
  const range = maxBal - minBal || 1;

  const xOf = (i) => PAD.left + (i / Math.max(n - 1, 1)) * chartW;
  const yOf = (v) => PAD.top + chartH - ((v - minBal) / range) * chartH;

  // Build path
  const solidPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.balance).toFixed(1)}`).join(' ');
  const projPath = projPoints.length > 0
    ? `M${xOf(points.length - 1).toFixed(1)},${yOf(points[points.length - 1].balance).toFixed(1)} ` +
      projPoints.map((p, i) => `L${xOf(points.length + i).toFixed(1)},${yOf(p.balance).toFixed(1)}`).join(' ')
    : '';

  // Area fill path
  const areaPath = solidPath +
    ` L${xOf(points.length - 1).toFixed(1)},${yOf(minBal).toFixed(1)}` +
    ` L${xOf(0).toFixed(1)},${yOf(minBal).toFixed(1)} Z`;

  // Y-axis gridlines (4 lines)
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map(f => minBal + f * range);

  // X-axis labels: show first, last, and a few middle ones
  const labelIndices = new Set();
  labelIndices.add(0);
  labelIndices.add(n - 1);
  if (n > 4) labelIndices.add(Math.floor(n / 2));
  if (n > 8) { labelIndices.add(Math.floor(n / 4)); labelIndices.add(Math.floor(3 * n / 4)); }

  const burnOutY = yOf(0);
  const showBurnLine = minBal <= 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320, maxHeight: 260 }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={yOf(v).toFixed(1)}
              x2={PAD.left + chartW} y2={yOf(v).toFixed(1)}
              stroke="#e5e7eb" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={yOf(v) + 4}
              textAnchor="end" fontSize="10" fill="#9ca3af"
            >
              {v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`}
            </text>
          </g>
        ))}

        {/* Zero line (budget exhausted) */}
        {showBurnLine && (
          <line
            x1={PAD.left} y1={burnOutY.toFixed(1)}
            x2={PAD.left + chartW} y2={burnOutY.toFixed(1)}
            stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3"
          />
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#balGrad)" />

        {/* Solid line */}
        <path d={solidPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Projection line */}
        {projPath && (
          <path d={projPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,4" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Data point dots */}
        {points.map((p, i) => (
          i > 0 && (
            <circle key={i} cx={xOf(i).toFixed(1)} cy={yOf(p.balance).toFixed(1)} r="3"
              fill="white" stroke="#3b82f6" strokeWidth="2" />
          )
        ))}

        {/* X-axis labels */}
        {allPoints.map((p, i) => (
          labelIndices.has(i) && (
            <text key={i} x={xOf(i)} y={H - 8}
              textAnchor="middle" fontSize="10"
              fill={p.projected ? '#f59e0b' : '#6b7280'}
            >
              {p.month === (balanceSeries[0]?.month.substring(0, 4) + '-00') ? `Jan ${p.month.substring(0, 4)}` : fmtMonth(p.month)}
            </text>
          )
        ))}

        {/* Projection label */}
        {projPoints.length > 0 && (
          <text
            x={xOf(points.length + projPoints.length - 1) + 4}
            y={yOf(projPoints[projPoints.length - 1].balance) - 6}
            fontSize="9" fill="#f59e0b" fontWeight="600"
          >
            Projected
          </text>
        )}
      </svg>
    </div>
  );
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function SpendingTracker() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1].map(String);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedDept, setSelectedDept] = useState('');

  // For requesters/managers, force their scope
  const canChooseDept = ['finance', 'executive', 'admin'].includes(user?.role);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { fiscal_year: selectedYear };
    if (canChooseDept && selectedDept) params.department = selectedDept;
    api.getSpendingTracker(params)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedYear, selectedDept]);

  const usedPct = data ? pct(data.totalApproved, data.totalBudget) : 0;
  const balancePct = data ? pct(data.currentBalance, data.totalBudget) : 0;

  const balanceColor = usedPct >= 90 ? 'text-red-600' : usedPct >= 70 ? 'text-yellow-600' : 'text-green-600';
  const barColor = usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Spending Tracker</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Declining balance view of CAPEX budget consumption over the fiscal year.
        </p>
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
          {canChooseDept && (
            <div>
              <label className="form-label">Department</label>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="form-select">
                <option value="">All Departments</option>
                {data?.departments?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="card text-center text-red-600 py-10">{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Budget</p>
              <p className="text-xl font-bold text-gray-900">{fmt(data.totalBudget)}</p>
              <p className="text-xs text-gray-400">FY{data.fiscalYear}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Approved / Committed</p>
              <p className="text-xl font-bold text-blue-600">{fmt(data.totalApproved)}</p>
              <p className="text-xs text-gray-400">{usedPct}% of budget</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remaining Balance</p>
              <p className={`text-xl font-bold ${balanceColor}`}>{fmt(data.currentBalance)}</p>
              <p className="text-xs text-gray-400">{balancePct}% remaining</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Monthly Burn</p>
              <p className="text-xl font-bold text-gray-700">{fmt(data.avgMonthlyBurn)}</p>
              {data.projectedExhaustionDate && data.projectedExhaustionDate !== 'exhausted' ? (
                <p className="text-xs text-amber-600">Est. exhaustion: {fmtMonth(data.projectedExhaustionDate)}</p>
              ) : data.projectedExhaustionDate === 'exhausted' ? (
                <p className="text-xs text-red-600 font-semibold">Budget exhausted</p>
              ) : (
                <p className="text-xs text-gray-400">No burn rate data</p>
              )}
            </div>
          </div>

          {/* Burn progress bar */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Budget Utilization</span>
              <span className="text-sm text-gray-500">{usedPct}% approved</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>{fmt(data.totalApproved)} approved</span>
              <span>{fmt(data.currentBalance)} remaining</span>
            </div>
          </div>

          {/* Declining balance chart */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Declining Balance Chart</h2>
              {data.projectedExhaustionDate && data.projectedExhaustionDate !== 'exhausted' && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1">
                  Projection shown in amber
                </span>
              )}
            </div>
            <BalanceChart
              balanceSeries={data.balanceSeries}
              totalBudget={data.totalBudget}
              projectedExhaustionDate={data.projectedExhaustionDate}
              avgMonthlyBurn={data.avgMonthlyBurn}
            />
          </div>

          {/* Monthly burn breakdown */}
          {data.monthlyBurn.length > 0 && (
            <div className="card mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Spend Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4 text-right">Requests</th>
                      <th className="pb-2 pr-4 text-right">Amount Approved</th>
                      <th className="pb-2 text-right">% of Total Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.monthlyBurn.map(m => (
                      <tr key={m.month}>
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{fmtMonth(m.month)}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600">{m.count}</td>
                        <td className="py-2.5 pr-4 text-right text-blue-600 font-medium">{fmt(m.approved)}</td>
                        <td className="py-2.5 text-right text-gray-600">{pct(m.approved, data.totalBudget)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approved transactions (declining balance table) */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">
              Approved Requests &amp; Running Balance
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({data.transactions.length} request{data.transactions.length !== 1 ? 's' : ''})
              </span>
            </h2>
            {data.transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No approved requests for FY{data.fiscalYear}
                {selectedDept ? ` in ${selectedDept}` : ''}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Request</th>
                      <th className="pb-2 pr-3">Department</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2 pr-3 text-right">Amount</th>
                      <th className="pb-2 text-right">Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Starting balance row */}
                    <tr className="bg-gray-50">
                      <td className="py-2.5 pr-3 text-gray-400 text-xs">—</td>
                      <td className="py-2.5 pr-3 font-semibold text-gray-700" colSpan="3">
                        Starting Budget Balance
                      </td>
                      <td className="py-2.5 pr-3" />
                      <td className="py-2.5 text-right font-bold text-gray-900">{fmt(data.totalBudget)}</td>
                    </tr>
                    {data.transactions.map(t => {
                      const balColor = t.balance_after < 0
                        ? 'text-red-600 font-bold'
                        : t.balance_after < data.totalBudget * 0.1
                        ? 'text-red-500 font-semibold'
                        : t.balance_after < data.totalBudget * 0.25
                        ? 'text-yellow-600 font-semibold'
                        : 'text-gray-900';
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap text-xs">
                            {t.approved_at ? new Date(t.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Link to={`/requests/${t.id}`} className="font-medium text-blue-700 hover:underline">
                              {t.title}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority] || 'bg-gray-100 text-gray-600'}`}>
                                {t.priority}
                              </span>
                              <span className="text-xs text-gray-400">{t.requester_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-gray-600">{t.department}</td>
                          <td className="py-2.5 pr-3 text-gray-600 text-xs">{t.category}</td>
                          <td className="py-2.5 pr-3 text-right text-red-500 font-medium">
                            −{fmt(t.amount)}
                          </td>
                          <td className={`py-2.5 text-right ${balColor}`}>
                            {fmt(t.balance_after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
