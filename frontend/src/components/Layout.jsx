import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS = {
  requester: 'Requester',
  manager: 'Manager',
  finance: 'Finance',
  executive: 'Executive',
  admin: 'Administrator',
};

function NavItem({ to, icon, label, badge }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Layout({ children, pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showApprovalBadge = ['manager', 'finance', 'executive', 'admin'].includes(user?.role);

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/requests', icon: '📋', label: 'CAPEX Requests', badge: showApprovalBadge ? pendingCount : 0 },
    { to: '/requests/new', icon: '➕', label: 'New Request' },
    ...(user?.role !== 'requester' ? [{ to: '/budgets', icon: '💰', label: 'Budget Management' }] : []),
  ];

  const NavContent = () => (
    <nav className="space-y-1">
      {navItems.map(item => (
        <NavItem key={item.to} {...item} />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              CX
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">CAPEX Portal</p>
              <p className="text-xs text-gray-500">Approval System</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <NavContent />
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full text-xs py-1.5">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CX</div>
          <span className="font-bold text-gray-900 text-sm">CAPEX Portal</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-14">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white w-64 h-full flex flex-col shadow-xl">
            <div className="flex-1 p-4 overflow-y-auto">
              <NavContent />
            </div>
            <div className="p-4 border-t">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 mb-3">{ROLE_LABELS[user?.role]} · {user?.department}</p>
              <button onClick={handleLogout} className="btn-secondary w-full text-xs py-1.5">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
