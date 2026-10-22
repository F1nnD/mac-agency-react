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
import ProtectedRoute from './components/ProtectedRoute';
import CustomerRoute from './components/CustomerRoute';
import './index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/about-detail" element={<AboutDetail />} />
        <Route path="/AboutDetail" element={<AboutDetail />} />

        {/* Khu vực khách hàng — bắt buộc đăng nhập */}
        <Route path="/index" element={<CustomerRoute><Index /></CustomerRoute>} />
        <Route path="/home" element={<CustomerRoute><Home /></CustomerRoute>} />
        <Route path="/portfolio" element={<CustomerRoute><Portfolio /></CustomerRoute>} />
        <Route path="/project-detail" element={<CustomerRoute><ProjectDetail /></CustomerRoute>} />
        <Route path="/pricing" element={<CustomerRoute><Pricing /></CustomerRoute>} />
        <Route path="/ai-studio" element={<CustomerRoute><AIStudio /></CustomerRoute>} />

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
    </Router>
  );
}