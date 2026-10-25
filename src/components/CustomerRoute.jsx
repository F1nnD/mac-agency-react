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

    // Kiểm tra xem Admin có đang chủ động đi xem Web không
    const isViewingWeb = sessionStorage.getItem('isAdminViewingWeb') === 'true';

    // Admin/staff không thuộc khu vực khách → đẩy về dashboard (trừ khi họ chủ động bấm xem Web)
    if (['admin', 'staff'].includes(user.role) && !isViewingWeb) {
      return <Navigate to="/admin/dashboard" replace />;
    }

  // customer_free / customer_pro → OK
  return children;
}