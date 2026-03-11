import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Landing from './pages/Landing';
import ActiveBidding from './pages/ActiveBidding';
import BidBulletins from './pages/BidBulletins';
import SupplierRegister from './pages/SupplierRegister';
import RequestProgress from './pages/RequestProgress';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import RequestDetail from './pages/RequestDetail';
import History from './pages/History';
import Approvals from './pages/Approvals';
import ManageLanding from './pages/ManageLanding';
import Users from './pages/Users';
import Vendors from './pages/Vendors';
import AccreditationPortal from './pages/AccreditationPortal';
import AnnualProcurementPlan from './pages/AnnualProcurementPlan';
import BidWinnersAwardees from './pages/BidWinnersAwardees';
import Budget from './pages/Budget';
import BudgetFundSources from './pages/BudgetFundSources';

function RootRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/accreditation-portal" replace />;
  if (isAdmin()) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/request-progress" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/active-bidding" element={<ActiveBidding />} />
          <Route path="/bid-bulletins" element={<BidBulletins />} />
          <Route path="/supplier-register" element={<SupplierRegister />} />
          <Route path="/accreditation-portal" element={<AccreditationPortal />} />
          <Route path="/annual-procurement-plan" element={<AnnualProcurementPlan />} />
          <Route path="/bid-winners-awardees" element={<BidWinnersAwardees />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          
          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route path="/request-progress" element={<RequestProgress />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/new" element={<NewRequest />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/manage-landing" element={<ManageLanding />} />
            <Route path="/users" element={<Users />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/budget/:budgetId/funds" element={<BudgetFundSources />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

