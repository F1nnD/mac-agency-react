import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Index from './pages/Index';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';       
import ProjectDetail from './pages/ProjectDetail'; 
import Packages from './pages/Packages';           
import AboutDetail from './pages/AboutDetail';     
import Login from './pages/Login';                 // ĐA THÊM: Nạp trang Login vào hệ thống
import Dashboard from './pages/Dashboard';
import ReceiptView from './pages/ReceiptView';     // ĐA THÊM: Nạp trình xem hóa đơn di động thông minh
import './index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/index" element={<Index />} />
        <Route path="/home" element={<Home />} />
        
        {/* HẠ TẦNG ĐỊNH TUYẾN MỚI CỦA MAC */}
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/project-detail" element={<ProjectDetail />} />
        <Route path="/packages" element={<Packages />} />
        
        {/* Thêm Route dự phòng viết hoa chữ để giải quyết triệt để lỗi gõ URL lệch ký tự */}
        <Route path="/about-detail" element={<AboutDetail />} />
        <Route path="/AboutDetail" element={<AboutDetail />} />
        
        {/* ĐA THÊM: Định tuyến chính thức cho trang xem hóa đơn số hóa bằng điện thoại */}
        <Route path="/receipt-view" element={<ReceiptView />} />
        
        {/* ĐA THÊM: Định tuyến chính thức cho trang đăng nhập bảo mật */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}