import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { api } from './api';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestList from './pages/RequestList';
import RequestDetail from './pages/RequestDetail';
import RequestForm from './pages/RequestForm';
import BudgetManagement from './pages/BudgetManagement';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'requester') return;
    api.getDashboard()
      .then(d => setPendingCount(d.pendingApproval || 0))
      .catch(() => {});
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout pendingCount={pendingCount}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/requests" element={<RequestList />} />
        <Route path="/requests/new" element={<RequestForm />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/requests/:id/edit" element={<RequestForm />} />
        {user.role !== 'requester' && (
          <Route path="/budgets" element={<BudgetManagement />} />
        )}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
