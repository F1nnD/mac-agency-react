import React, { useEffect, useState } from 'react';
import { api, statsApi } from '../../utils/apiClient';
import AdminTable, { TableSkeleton, ErrorState } from './AdminTable';

export default function StatsTab() {
  const [overview, setOverview] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, topRes, actRes] = await Promise.all([
        api.get('/api/stats/overview'),
        api.get('/api/stats/top-users'),
        api.get('/api/stats/activity-7days')
      ]);

      setOverview(ovRes.data);
      setTopUsers(topRes.data);
      setActivity(actRes.data.loginsByDay || []);
      // Phễu là phần phụ: lỗi ở đây không được làm hỏng cả trang thống kê
      statsApi.funnel(days).then(r => setFunnel(r.data)).catch(() => setFunnel(null));
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu thống kê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) {
    return (
      <div className="tab-content-anim space-y-6 w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-zinc-900/20 border border-white/5 motion-safe:animate-pulse" />)}
        </div>
        <TableSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchStats} />;
  }

  const scoreBadge = (u) => (
    <span className={`inline-block px-3 py-1 rounded font-bold font-mono ${
      u.engagementScore >= 70 ? 'bg-red-500/20 text-red-400' :
      u.engagementScore >= 40 ? 'bg-amber-400/20 text-amber-400' :
      'bg-gray-500/20 text-gray-400'
    }`}>
      {u.engagementScore}/100
    </span>
  );

  const topColumns = [
    { key: 'rank', label: '#', align: 'center', hideOnMobile: true, render: (u, i) => <span className="font-mono text-gray-500">{i + 1}</span> },
    {
      key: 'user', label: 'Khách hàng', primary: true,
      render: (u, i) => (
        <div>
          <p className="font-bold text-white"><span className="md:hidden text-gray-500 font-mono mr-2">#{i + 1}</span>{u.fullName || u.username}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5 break-all">{u.email || 'Không có email'}</p>
        </div>
      )
    },
    { key: 'login', label: 'Login', align: 'center', render: u => <span className="font-mono text-gray-300">{u.loginCount || 0}</span> },
    { key: 'render', label: 'Render', align: 'center', render: u => <span className="font-mono text-gray-300">{u.renderCount || 0}</span> },
    { key: 'projects', label: 'Dự án', align: 'center', render: u => <span className="font-mono text-gray-300">{(u.floorPlanCount || 0) + (u.conceptCount || 0)}</span> },
    { key: 'score', label: 'Điểm quan tâm', align: 'right', render: scoreBadge }
  ];

  // Tìm max count để vẽ biểu đồ cột tỷ lệ thuận
  const maxLogin = Math.max(...activity.map(a => a.count), 1);

  return (
    <div className="tab-content-anim space-y-8 w-full">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
            Business Intelligence
          </span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">
            Thống kê & Phân tích
          </h1>
        </div>
        <button
          onClick={fetchStats}
          className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 min-h-11 rounded-xl hover:border-white transition-all cursor-pointer"
        >
          Làm mới
        </button>
      </div>

      {/* TỔNG QUAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Tổng người dùng</p>
          <p className="text-3xl font-bold text-white font-mono mt-2">{overview?.totalUsers || 0}</p>
        </div>
        <div className="bg-emerald-400/5 border border-emerald-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-bold">Tổng Leads</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono mt-2">{overview?.totalLeads || 0}</p>
        </div>
        <div className="bg-amber-400/5 border border-amber-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-bold">Mặt bằng đã nhập</p>
          <p className="text-3xl font-bold text-amber-400 font-mono mt-2">{overview?.totalFloorPlans || 0}</p>
        </div>
        <div className="bg-cyan-400/5 border border-cyan-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">Concept đã nhập</p>
          <p className="text-3xl font-bold text-cyan-400 font-mono mt-2">{overview?.totalConcepts || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BIỂU ĐỒ HOẠT ĐỘNG (7 NGÀY) */}
        <div className="lg:col-span-1 bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">Lượt đăng nhập 7 ngày</h3>
          
          <div className="flex-1 flex items-end justify-between gap-2 h-40">
            {activity.length === 0 ? (
              <p className="text-xs text-white/30 italic w-full text-center">Chưa có dữ liệu</p>
            ) : (
                activity.map((a, i) => {
                    const heightPercent = (a.count / maxLogin) * 100;
                    // Thêm kiểm tra an toàn: Nếu a.id không tồn tại hoặc không phải string thì gán nhãn rỗng
                    let dateLabel = '';
                    if (a.id && typeof a.id === 'string') {
                      const dateParts = a.id.split('-');
                      dateLabel = `${dateParts[2]}/${dateParts[1]}`;
                    }
                
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <span className="text-[10px] text-emerald-400 font-mono mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {a.count}
                    </span>
                    <div 
                      className="w-full bg-emerald-500/20 group-hover:bg-emerald-400 transition-colors rounded-t-sm"
                      style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    ></div>
                    <span className="text-[9px] text-gray-500 mt-2 font-mono">{dateLabel}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PHÂN BỔ USER THEO ROLE */}
        <div className="lg:col-span-2 bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">Phân bổ Role người dùng</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {overview?.usersByRole?.map(role => (
              <div key={role._id} className="bg-black/40 border border-white/5 p-4 rounded-xl text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">{role._id}</p>
                <p className="text-2xl font-bold text-white font-mono">{role.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PHỄU CHUYỂN ĐỔI */}
      {funnel && (
        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Phễu chuyển đổi khách hàng</h3>
              <p className="text-[10px] text-gray-500 mt-1">Khách rơi ở bước nào, quan tâm style nào nhiều nhất</p>
            </div>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={365}>1 năm</option>
            </select>
          </div>

          <div className="space-y-3">
            {funnel.steps.map((s, i) => (
              <div key={s.key} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1">
                <span className="w-full sm:w-36 shrink-0 text-[11px] text-gray-400">{s.label}</span>
                <div className="flex-1 min-w-0 h-7 bg-black/40 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/30 border-r-2 border-emerald-400 transition-all"
                    style={{ width: `${Math.max(s.pctOfFirst, s.count ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-bold text-white font-mono">{s.count}</span>
                <span className="w-24 shrink-0 text-right text-[10px] text-gray-500 font-mono">
                  {i === 0 ? '' : `${s.pctOfPrev}% bước trước`}
                </span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
            {[['Style được chọn nhiều', funnel.styles], ['Loại công trình', funnel.spaceTypes]].map(([title, rows]) => {
              const max = Math.max(...rows.map(r => r.count), 1);
              return (
                <div key={title}>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">{title}</p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-white/30 italic">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-2">
                      {rows.slice(0, 6).map(r => (
                        <div key={r._id} className="flex items-center gap-3 text-[11px]">
                          <span className="w-28 shrink-0 text-gray-400 truncate">{r._id}</span>
                          <div className="flex-1 h-2 bg-black/40 rounded">
                            <div className="h-full bg-amber-400/60 rounded" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <span className="w-8 text-right font-mono text-white">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP USER QUAN TÂM NHẤT */}
      <div className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">Top Khách hàng quan tâm nhất</h3>
          <p className="text-[10px] text-gray-500 mt-1">Dựa trên điểm tương tác (Đăng nhập, Render, Tạo dự án, Gửi liên hệ)</p>
        </div>
        <div className="p-3 md:p-0">
          <AdminTable columns={topColumns} rows={topUsers} emptyText="Chưa có dữ liệu" className="md:[&>div]:rounded-none md:[&>div]:border-0" />
        </div>
      </div>
    </div>
  );
}