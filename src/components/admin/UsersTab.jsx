import React, { useEffect, useState } from 'react';
import { usersApi, getCurrentUser } from '../../utils/apiClient';

const ROLES = [
  { value: 'customer_free', label: 'Khách thường' },
  { value: 'customer_pro', label: 'Khách Pro' },
  { value: 'staff', label: 'Nhân viên MAC' },
  { value: 'admin', label: 'Quản trị' }
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));
const field = 'bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30';
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
    } catch (err) {
      setError(err.message || 'Không cập nhật được.');
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
    } catch (err) {
      setError(err.message || 'Không tạo được tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Access Control</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Quản Lý Người Dùng</h1>
          <p className="text-[11px] text-gray-500 mt-2 max-w-xl">
            Nhân viên MAC và quản trị dùng được AI nội bộ. Khách dùng AI thường và AI Studio. Thay đổi quyền có hiệu lực ngay ở lần gọi tiếp theo.
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-amber-300 transition-all">
          {showForm ? 'Đóng' : '+ Tạo tài khoản'}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input className={field} placeholder="Tên đăng nhập" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input className={field} type="password" placeholder="Mật khẩu (từ 8 ký tự)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <input className={field} placeholder="Họ tên" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          <select className={field} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button disabled={saving} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50">
            {saving ? 'Đang tạo...' : 'Tạo'}
          </button>
        </form>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <input className={`flex-1 ${field}`} placeholder="Tìm theo tên đăng nhập, họ tên, email..." value={q} onChange={e => setQ(e.target.value)} />
        <select className={`${field} cursor-pointer`} value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Tất cả quyền</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm">Không có người dùng nào</div>
      ) : (
        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
                <th className="p-4 font-bold">Người dùng</th>
                <th className="p-4 font-bold">Quyền</th>
                <th className="p-4 font-bold">Hết hạn Pro</th>
                <th className="p-4 font-bold text-center">Đăng nhập</th>
                <th className="p-4 font-bold">Lần cuối</th>
                <th className="p-4 font-bold text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="text-xs text-white">
              {users.map(u => {
                const isMe = u._id === me?.userId;
                return (
                  <tr key={u._id} className={`border-b border-white/5 hover:bg-white/5 transition-all ${u.isActive ? '' : 'opacity-50'}`}>
                    <td className="p-4">
                      <p className="font-bold">{u.fullName || u.username}{isMe && <span className="ml-2 text-[9px] text-amber-400 uppercase">bạn</span>}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{u.username}{u.email ? ` · ${u.email}` : ''}</p>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        disabled={isMe}
                        onChange={e => patch(u, { role: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer disabled:opacity-50"
                        title={isMe ? 'Không thể tự đổi quyền của chính mình' : ROLE_LABEL[u.role]}
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      {u.role === 'customer_pro' ? (
                        <input
                          type="date"
                          defaultValue={toDateInput(u.proExpiresAt)}
                          onChange={e => patch(u, { proExpiresAt: e.target.value || null })}
                          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-4 text-center font-mono text-gray-300">{u.loginCount || 0}</td>
                    <td className="p-4 text-gray-400 font-mono">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}</td>
                    <td className="p-4 text-center">
                      <button
                        disabled={isMe}
                        onClick={() => patch(u, { isActive: !u.isActive })}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${u.isActive ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' : 'text-red-400 border-red-500/30 hover:bg-red-500/10'}`}
                      >
                        {u.isActive ? 'Hoạt động' : 'Đã khoá'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
