import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Landing from './pages/Landing';
import ActiveBidding from './pages/ActiveBidding';
import BidBulletins from './pages/BidBulletins';
import SupplierRegister from './pages/SupplierRegister';
import Users from './pages/Users';
import Budget from './pages/Budget';
import Logs from './pages/Logs';
import Colleges from './pages/Colleges';
import AdminRoute from './components/AdminRoute';
import FacultyRoute from './components/FacultyRoute';
import DeptHeadRoute from './components/DeptHeadRoute';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyNewRequest from './pages/FacultyNewRequest';
import FacultyRequestHistory from './pages/FacultyRequestHistory';
import FacultyInventoryCustodian from './pages/FacultyInventoryCustodian';
import DeptHeadHome from './pages/DeptHeadHome';
import DeptHeadBudget from './pages/DeptHeadBudget';
import DeptHeadRequestHistory from './pages/DeptHeadRequestHistory';
import AccreditationPortal from './pages/AccreditationPortal';
import AnnualProcurementPlan from './pages/AnnualProcurementPlan';
import BidWinnersAwardees from './pages/BidWinnersAwardees';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/active-bidding" element={<ActiveBidding />} />
          <Route path="/bid-bulletins" element={<BidBulletins />} />
          <Route path="/supplier-register" element={<SupplierRegister />} />
          <Route path="/accreditation-portal" element={<AccreditationPortal />} />
          <Route path="/annual-procurement-plan" element={<AnnualProcurementPlan />} />
          <Route path="/bid-winners-awardees" element={<BidWinnersAwardees />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          
          {/* Authenticated layout: admin + faculty */}
          <Route element={<Layout />}>
            <Route element={<FacultyRoute />}>
              <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
              <Route path="/faculty/budget" element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="/faculty/new-request" element={<FacultyNewRequest />} />
              <Route path="/faculty/request-history" element={<FacultyRequestHistory />} />
              <Route path="/faculty/inventory-custodian" element={<FacultyInventoryCustodian />} />
            </Route>
            <Route element={<DeptHeadRoute />}>
              <Route path="/dept-head" element={<Navigate to="/dept-head/dashboard" replace />} />
              <Route path="/dept-head/dashboard" element={<DeptHeadHome />} />
              <Route path="/dept-head/budget" element={<DeptHeadBudget />} />
              <Route path="/dept-head/request-history" element={<DeptHeadRequestHistory />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/budget" element={<Budget />} />
              <Route path="/users" element={<Users />} />
              <Route path="/colleges" element={<Colleges />} />
              <Route path="/logs" element={<Logs />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

