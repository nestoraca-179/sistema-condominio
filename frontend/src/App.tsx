import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/Layout/MainLayout';

// Pages
import { LoginPage } from './pages/Login/LoginPage';

// Superadmin
import { SuperadminDashboard } from './pages/superadmin/DashboardPage';
import { CondominiumsPage } from './pages/superadmin/CondominiumsPage';
import { SuperadminUsersPage } from './pages/superadmin/UsersPage';

// Admin
import { AdminDashboard } from './pages/admin/DashboardPage';
import { StructurePage } from './pages/admin/StructurePage';
import { FeesPage } from './pages/admin/FeesPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { DebtsPage } from './pages/admin/DebtsPage';
import { NoticesPage as AdminNoticesPage } from './pages/admin/NoticesPage';
import { AdminReportsPage } from './pages/admin/ReportsPage';
import { AdminUsersPage } from './pages/admin/UsersPage';

// Accountant
import { AccountantDashboard } from './pages/accountant/DashboardPage';
import { ExchangeRatesPage } from './pages/accountant/ExchangeRatesPage';
import { GlobalStatementPage } from './pages/accountant/GlobalStatementPage';

// Resident
import { ResidentDashboard } from './pages/resident/DashboardPage';
import { ResidentNoticesPage } from './pages/resident/NoticesPage';
import { ResidentPaymentsPage } from './pages/resident/PaymentsPage';
import { ResidentProfilePage } from './pages/resident/ProfilePage';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  const redirects: Record<string, string> = {
    superadmin: '/superadmin',
    admin: '/admin',
    accountant: '/contador',
    resident: '/residente',
  };
  return <Navigate to={redirects[user?.role || ''] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />

      <Route element={<PrivateRoute roles={['superadmin']}><MainLayout /></PrivateRoute>}>
        <Route path="/superadmin" element={<SuperadminDashboard />} />
        <Route path="/superadmin/condominios" element={<CondominiumsPage />} />
        <Route path="/superadmin/usuarios" element={<SuperadminUsersPage />} />
      </Route>

      <Route element={<PrivateRoute roles={['admin']}><MainLayout /></PrivateRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/usuarios" element={<AdminUsersPage />} />
        <Route path="/admin/estructura" element={<StructurePage />} />
        <Route path="/admin/cuotas" element={<FeesPage />} />
        <Route path="/admin/pagos" element={<PaymentsPage />} />
        <Route path="/admin/deudas" element={<DebtsPage />} />
        <Route path="/admin/comunicados" element={<AdminNoticesPage />} />
        <Route path="/admin/reportes" element={<AdminReportsPage />} />
      </Route>

      <Route element={<PrivateRoute roles={['accountant']}><MainLayout /></PrivateRoute>}>
        <Route path="/contador" element={<AccountantDashboard />} />
        <Route path="/contador/tipo-cambio" element={<ExchangeRatesPage />} />
        <Route path="/contador/estado-cuenta" element={<GlobalStatementPage />} />
      </Route>

      <Route element={<PrivateRoute roles={['resident']}><MainLayout /></PrivateRoute>}>
        <Route path="/residente" element={<ResidentDashboard />} />
        <Route path="/residente/pagos" element={<ResidentPaymentsPage />} />
        <Route path="/residente/comunicados" element={<ResidentNoticesPage />} />
        <Route path="/residente/perfil" element={<ResidentProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
