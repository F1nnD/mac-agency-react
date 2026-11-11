import React, { useEffect, useState } from 'react';
import { usersApi, getCurrentUser } from '../../utils/apiClient';
import AdminTable, { ErrorState, useToast } from './AdminTable';

const ROLES = [
  { value: 'customer_free', label: 'Khách thường' },
  { value: 'customer_pro', label: 'Khách Pro' },
  { value: 'staff', label: 'Nhân viên MAC' },
  { value: 'admin', label: 'Quản trị' }
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));
const field = 'bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30';
const smallSel = 'bg-black/40 border border-white/10 rounded-lg px-3 min-h-11 text-base md:text-xs text-white focus:outline-none cursor-pointer disabled:opacity-50';
const toDateInput = d => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function UsersTab() {
  const me = getCurrentUser();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'staff' });
  const [saving, setSaving] = useState(false);
  const { toast, node: toastNode } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (q.trim()) params.set('q', q.trim());
      const res = await usersApi.list(params.toString() ? `?${params}` : '');
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, q]);

  const patch = async (u, data) => {
    setError('');
    try {
      const res = await usersApi.update(u._id, data);
      setUsers(prev => prev.map(x => (x._id === u._id ? { ...x, ...res.data } : x)));
      toast('Đã cập nhật tài khoản.');
    } catch (err) {
      setError(err.message || 'Không cập nhật được.');
      toast(err.message || 'Không cập nhật được.', 'error');
      fetchUsers();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.create(form);
      setForm({ username: '', password: '', fullName: '', role: 'staff' });
      setShowForm(false);
      fetchUsers();
      toast('Đã tạo tài khoản mới.');
    } catch (err) {
      setError(err.message || 'Không tạo được tài khoản.');
      toast(err.message || 'Không tạo được tài khoản.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (u) => {
    if (u.isActive && !window.confirm(`Khoá tài khoản "${u.username}"? Người này sẽ không đăng nhập được nữa.`)) return;
    patch(u, { isActive: !u.isActive });
  };

  const columns = [
    {
      key: 'user', label: 'Người dùng', primary: true,
      render: u => (
        <div>
          <p className="font-bold">{u.fullName || u.username}{u._id === me?.userId && <span className="ml-2 text-[9px] text-amber-400 uppercase">bạn</span>}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5 break-all">{u.username}{u.email ? ` · ${u.email}` : ''}</p>
        </div>
      )
    },
    {
      key: 'role', label: 'Quyền',
      render: u => {
        const isMe = u._id === me?.userId;
        return (
          <select
            value={u.role}
            disabled={isMe}
            onChange={e => patch(u, { role: e.target.value })}
            aria-label={`Quyền của ${u.username}`}
            className={smallSel}
            title={isMe ? 'Không thể tự đổi quyền của chính mình' : ROLE_LABEL[u.role]}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        );
      }
    },
    {
      key: 'pro', label: 'Hết hạn Pro',
      render: u => (u.role === 'customer_pro' ? (
        <input
          type="date"
          defaultValue={toDateInput(u.proExpiresAt)}
          onChange={e => patch(u, { proExpiresAt: e.target.value || null })}
          aria-label={`Hết hạn Pro của ${u.username}`}
          className="bg-black/40 border border-white/10 rounded-lg px-3 min-h-11 text-base md:text-xs text-white focus:outline-none"
        />
      ) : <span className="text-gray-600">—</span>)
    },
    { key: 'logins', label: 'Đăng nhập', align: 'center', render: u => <span className="font-mono text-gray-300">{u.loginCount || 0}</span> },
    { key: 'last', label: 'Lần cuối', render: u => <span className="text-gray-400 font-mono">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}</span> },
    {
      key: 'status', label: 'Trạng thái', align: 'center',
      render: u => (
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${u.isActive ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : 'text-red-400 border-red-500/30 bg-red-500/5'}`}>
          {u.isActive ? 'Hoạt động' : 'Đã khoá'}
        </span>
      )
    }
  ];

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Access Control</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Quản Lý Người Dùng</h1>
          <p className="text-[11px] text-gray-500 mt-2 max-w-xl">
            Nhân viên MAC và quản trị dùng được AI nội bộ. Khách dùng AI thường và AI Studio. Thay đổi quyền có hiệu lực ngay ở lần gọi tiếp theo.
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest px-5 min-h-11 rounded-xl hover:bg-amber-300 transition-all cursor-pointer w-full sm:w-auto">
          {showForm ? 'Đóng' : '+ Tạo tài khoản'}
        </button>
      </div>

      <ErrorState message={error} onRetry={fetchUsers} />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className={field} placeholder="Tên đăng nhập" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input className={field} type="password" placeholder="Mật khẩu (từ 8 ký tự)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <input className={field} placeholder="Họ tên" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          <select className={field} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button disabled={saving} className="min-h-11 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer hover:bg-neutral-200 transition-all disabled:opacity-50">
            {saving ? 'Đang tạo...' : 'Tạo'}
          </button>
        </form>
      )}

      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <input className={`flex-1 ${field}`} placeholder="Tìm theo tên đăng nhập, họ tên, email..." value={q} onChange={e => setQ(e.target.value)} />
        <select className={`${field} cursor-pointer`} value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Tất cả quyền</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <AdminTable
        columns={columns}
        rows={users}
        loading={loading}
        emptyText="Không có người dùng nào"
        rowClassName={u => (u.isActive ? '' : 'opacity-60')}
        actionsLabel="Khoá / mở"
        actions={u => {
          const isMe = u._id === me?.userId;
          return (
            <button
              type="button"
              disabled={isMe}
              onClick={() => toggleActive(u)}
              className={`min-h-11 w-full md:w-auto px-5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all disabled:opacity-40 cursor-pointer ${u.isActive ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'}`}
            >
              {isMe ? 'Tài khoản của bạn' : u.isActive ? 'Khoá tài khoản' : 'Mở khoá'}
            </button>
          );
        }}
      />

      {toastNode}
    </div>
  );
}
