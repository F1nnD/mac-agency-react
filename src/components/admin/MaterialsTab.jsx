import React, { useEffect, useState } from 'react';
import { dataApi } from '../../utils/apiClient';

const CATEGORY_OPTIONS = [
  { value: 'ket-cau', label: 'Kết cấu' },
  { value: 'hoan-thien', label: 'Hoàn thiện' },
  { value: 'noi-that', label: 'Nội thất' },
  { value: 'dien', label: 'Điện' },
  { value: 'nuoc', label: 'Nước' },
  { value: 'den', label: 'Đèn' },
  { value: 'san', label: 'Sàn' },
  { value: 'tran', label: 'Trần' },
  { value: 'tuong', label: 'Tường' },
  { value: 'cua', label: 'Cửa' },
  { value: 'khac', label: 'Khác' }
];

export default function MaterialsTab() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = filterCat ? `?category=${filterCat}` : '';
      const res = await dataApi.getMaterials(params);
      setMaterials(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [filterCat]);

  const filtered = materials.filter(m => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (m.name || '').toLowerCase().includes(term) || (m.code || '').toLowerCase().includes(term);
  });

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Material Management</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Kho Vật Tư (BOQ)</h1>
        </div>
        <button onClick={fetchMaterials} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:border-white transition-all">Tải lại</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo mã hoặc tên vật tư..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
        >
          <option value="">Tất cả phân loại</option>
          {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm">Chưa có vật tư nào</div>
      ) : (
        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
                <th className="p-4 font-bold">Mã</th>
                <th className="p-4 font-bold">Tên vật tư</th>
                <th className="p-4 font-bold">Phân loại</th>
                <th className="p-4 font-bold">Thương hiệu</th>
                <th className="p-4 font-bold">ĐVT</th>
              </tr>
            </thead>
            <tbody className="text-xs text-white">
              {filtered.map(m => (
                <tr key={m._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="p-4 font-mono text-amber-400">{m.code}</td>
                  <td className="p-4 font-semibold">{m.name}</td>
                  <td className="p-4 text-gray-400">{CATEGORY_OPTIONS.find(c => c.value === m.category)?.label || m.category}</td>
                  <td className="p-4 text-gray-400">{m.brand || '—'}</td>
                  <td className="p-4 font-mono">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
