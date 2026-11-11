import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Index from './pages/Index';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import ProjectDetail from './pages/ProjectDetail';
import Packages from './pages/Packages';
import AboutDetail from './pages/AboutDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import AIStudio from './pages/AIStudio';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import SharedRender from './pages/SharedRender';
import ConceptBoard from './pages/ConceptBoard';
import PageTransition from './components/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerRoute from './components/CustomerRoute';
import './index.css';

export default function App() {
  return (
    <Router>
      <PageTransition>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/share/:token" element={<SharedRender />} />
        <Route path="/about-detail" element={<AboutDetail />} />
        <Route path="/AboutDetail" element={<AboutDetail />} />

        {/* Khu vực khách hàng — bắt buộc đăng nhập */}
        <Route path="/index" element={<CustomerRoute><Index /></CustomerRoute>} />
        <Route path="/home" element={<CustomerRoute><Home /></CustomerRoute>} />
        <Route path="/portfolio" element={<CustomerRoute><Portfolio /></CustomerRoute>} />
        <Route path="/project-detail" element={<CustomerRoute><ProjectDetail /></CustomerRoute>} />
        <Route path="/pricing" element={<CustomerRoute><Pricing /></CustomerRoute>} />
        <Route path="/ai-studio" element={<CustomerRoute><AIStudio /></CustomerRoute>} />
        <Route path="/board/:id" element={<CustomerRoute><ConceptBoard /></CustomerRoute>} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      </PageTransition>
    </Router>
  );
}