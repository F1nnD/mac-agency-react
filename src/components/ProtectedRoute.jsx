import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/apiClient';

export default function ProtectedRoute({ children, allowedRoles = ['admin', 'staff'] }) {
  const location = useLocation();
  const token = localStorage.getItem('mac_token');
  const user = getCurrentUser();

  // Chưa đăng nhập → về login
  if (!token || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Không đủ quyền → hiện trang 403
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="w-full min-h-screen bg-[#0b0b0b] flex items-center justify-center text-center p-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-red-500">403</h1>
          <p className="text-white/60 text-sm uppercase tracking-widest">
            Bạn không có quyền truy cập trang này
          </p>
          <a
            href="/admin/login"
            className="inline-block mt-4 text-xs text-white/40 hover:text-white uppercase tracking-widest border border-white/10 px-6 py-3 rounded-full"
          >
            Đăng nhập tài khoản khác
          </a>
        </div>
      </div>
    );
  }

  return children;
}