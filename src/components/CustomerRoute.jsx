import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/apiClient';

export default function CustomerRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('mac_token');
  const user = getCurrentUser();

  // Chưa đăng nhập → bắt buộc về Login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin/staff không thuộc khu vực khách → đẩy về dashboard
  if (['admin', 'staff'].includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // customer_free / customer_pro → OK
  return children;
}