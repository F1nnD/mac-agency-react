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

const EMPTY_FORM = { code: '', name: '', category: 'hoan-thien', unit: '', normPerM2: '', brand: '' };
const inputCls = 'bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30';

export default function MaterialsTab() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = filterCat ? `?category=${filterCat}` : '';
      const res = await dataApi.getMaterials(params);
      setMaterials(res.data || []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách vật tư.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat]);

  const filtered = materials.filter(m => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (m.name || '').toLowerCase().includes(term) || (m.code || '').toLowerCase().includes(term);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim() || !form.unit.trim()) {
      setError('Cần nhập mã, tên và đơn vị tính.');
      return;
    }
    setSaving(true);
    try {
      await dataApi.createMaterial({
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category,
        unit: form.unit.trim(),
        brand: form.brand.trim(),
        normPerM2: Number(form.normPerM2) || 0
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchMaterials();
    } catch (err) {
      setError(err.message || 'Không lưu được vật tư (mã có thể đã tồn tại).');
    } finally {
      setSaving(false);
    }
  };

  // Lưu định mức khi rời ô nhập
  const saveNorm = async (m, value) => {
    const norm = Math.max(0, Number(value) || 0);
    if (norm === (m.normPerM2 || 0)) return;
    try {
      await dataApi.updateMaterial(m._id, { normPerM2: norm });
      setMaterials(prev => prev.map(x => (x._id === m._id ? { ...x, normPerM2: norm } : x)));
    } catch (err) {
      setError(err.message || 'Không lưu được định mức.');
    }
  };

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Material Management</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Kho Vật Tư (BOQ)</h1>
          <p className="text-[11px] text-gray-500 mt-2 max-w-xl">
            Định mức là khối lượng vật tư cho mỗi m² sàn. Vật tư có định mức lớn hơn 0 và có báo giá sẽ được AI dùng để dự toán sơ bộ.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(v => !v)} className="bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-amber-300 transition-all">
            {showForm ? 'Đóng' : '+ Thêm vật tư'}
          </button>
          <button onClick={fetchMaterials} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:border-white transition-all">Tải lại</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <input className={inputCls} placeholder="Mã (vd: XM-PC40)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <input className={`${inputCls} col-span-2 md:col-span-2`} placeholder="Tên vật tư" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className={inputCls} placeholder="Đơn vị (m2, kg, bộ...)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="any" placeholder="Định mức / m² sàn" value={form.normPerM2} onChange={e => setForm({ ...form, normPerM2: e.target.value })} />
          <input className={`${inputCls} col-span-2 md:col-span-2`} placeholder="Thương hiệu (không bắt buộc)" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
          <button disabled={saving} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu vật tư'}
          </button>
        </form>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo mã hoặc tên vật tư..."
          className={`flex-1 ${inputCls}`}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`${inputCls} cursor-pointer`}>
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
                <th className="p-4 font-bold">Định mức / m²</th>
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
                  <td className="p-4">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={m.normPerM2 || 0}
                      onBlur={e => saveNorm(m, e.target.value)}
                      className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
