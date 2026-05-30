import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import InvestmentPage from './pages/InvestmentPage';
import SavingsPage from './pages/SavingsPage';
import FinancialAnalysis from './pages/FinancialAnalysis';
import FamilyManagement from './pages/FamilyManagement';
import SysAdminPage from './pages/SysAdminPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-layout">
        <div style={{ color: '#fff', fontSize: 18 }}>載入中...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-layout">
        <div style={{ color: '#fff', fontSize: 18 }}>載入中...</div>
      </div>
    );
  }
  if (user) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/sysadmin" element={<SysAdminPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expenses" element={<ExpensePage />} />
        <Route path="investments" element={<InvestmentPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="analysis" element={<FinancialAnalysis />} />
        <Route path="family" element={<FamilyManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
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
