import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DEMO_ACCOUNTS = [
  { email: 'alice@company.com', role: 'Requester', dept: 'Engineering' },
  { email: 'carol@company.com', role: 'Manager', dept: 'Engineering' },
  { email: 'emma@company.com', role: 'Finance', dept: 'Finance' },
  { email: 'frank@company.com', role: 'Executive', dept: 'Executive' },
  { email: 'admin@company.com', role: 'Admin', dept: 'IT' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-start">
        {/* Login form */}
        <div className="card lg:order-2">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                CX
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CAPEX Portal</h1>
                <p className="text-sm text-gray-500">Capital Expenditure Approval System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-600 mt-1">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="lg:order-1">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Demo Accounts</h3>
          <p className="text-xs text-gray-500 mb-4">All accounts use password: <code className="bg-white px-1 py-0.5 rounded border">password123</code></p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => quickLogin(account.email)}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{account.role}</p>
                    <p className="text-xs text-gray-500">{account.email} · {account.dept}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-400 text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-xs font-semibold text-blue-800 mb-2">Approval Workflow</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>1. Requester submits CAPEX request</p>
              <p>2. Manager reviews and approves/rejects</p>
              <p>3. Finance reviews budget impact</p>
              <p>4. Executive approves requests ≥ $50,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
