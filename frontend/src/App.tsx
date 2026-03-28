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
import AdminRoute from './components/AdminRoute';
import FacultyRoute from './components/FacultyRoute';
import FacultyHome from './pages/FacultyHome';
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
              <Route path="/faculty" element={<FacultyHome />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/budget" element={<Budget />} />
              <Route path="/users" element={<Users />} />
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

