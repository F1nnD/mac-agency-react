import React, { useEffect, useState } from 'react';
import { dataApi } from '../../utils/apiClient';
import ImportDialog from './ImportDialog';
import StalePricesBanner from './StalePricesBanner';

export default function MarketPricesTab() {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ price: '', supplier: '', region: 'TP.HCM', source: 'bao-gia-ncc' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [staleKey, setStaleKey] = useState(0);

  // Tải danh sách vật tư để đưa vào dropdown
  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await dataApi.getMaterials();
        setMaterials(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedMaterial(res.data[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMaterials();
  }, []);

  const loadPrices = async (materialId = selectedMaterial) => {
    if (!materialId) return;
    setLoading(true);
    try {
      const res = await dataApi.getMarketPrices(materialId);
      setPrices(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Tải giá khi chọn vật tư
  useEffect(() => {
    loadPrices(selectedMaterial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial]);

  const handleAddPrice = async (e) => {
    e.preventDefault();
    setError('');
    const price = Number(form.price);
    if (!(price > 0)) {
      setError('Nhập đơn giá lớn hơn 0.');
      return;
    }
    const mat = materials.find(m => m._id === selectedMaterial);
    if (!mat) return;
    setSaving(true);
    try {
      await dataApi.createMarketPrice({
        materialId: mat._id,
        price,
        unit: mat.unit,
        supplier: form.supplier.trim(),
        region: form.region.trim() || 'TP.HCM',
        source: form.source
      });
      setForm(f => ({ ...f, price: '', supplier: '' }));
      loadPrices(mat._id);
    } catch (err) {
      setError(err.message || 'Không lưu được báo giá.');
    } finally {
      setSaving(false);
    }
  };

  const currentMat = materials.find(m => m._id === selectedMaterial);

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Market Price Management</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Giá Thị Trường Vật Tư</h1>
        </div>
        <button onClick={() => setShowImport(true)} className="min-h-[44px] border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all">Nhập từ file</button>
      </div>

      <StalePricesBanner refreshKey={staleKey} />

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <label className="text-xs text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">Chọn vật tư:</label>
        <select
          value={selectedMaterial}
          onChange={e => setSelectedMaterial(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
        >
          {materials.map(m => (
            <option key={m._id} value={m._id}>{m.code} - {m.name}</option>
          ))}
        </select>
      </div>

      {currentMat && (
        <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-xl flex flex-wrap gap-x-6 gap-y-2">
          <div><span className="text-[10px] text-gray-500 uppercase">ĐVT:</span> <span className="text-white font-mono text-xs">{currentMat.unit}</span></div>
          <div><span className="text-[10px] text-gray-500 uppercase">Phân loại:</span> <span className="text-white text-xs">{currentMat.category}</span></div>
        </div>
      )}

      {currentMat && (
        <form onSubmit={handleAddPrice} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input type="number" min="0" step="any" placeholder={`Đơn giá (đ/${currentMat.unit})`} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-white/30" />
          <input type="text" placeholder="Nhà cung cấp" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
          <input type="text" placeholder="Khu vực" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer">
            <option value="bao-gia-ncc">Báo giá NCC</option>
            <option value="khao-sat">Khảo sát</option>
            <option value="website">Website</option>
            <option value="noi-bo">Nội bộ</option>
          </select>
          <button disabled={saving} className="bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-amber-300 transition-all disabled:opacity-50">
            {saving ? 'Đang lưu...' : '+ Thêm báo giá'}
          </button>
          {error && <p className="col-span-2 md:col-span-5 text-red-400 text-[11px]">{error}</p>}
        </form>
      )}

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải...</div>
      ) : prices.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm">Chưa có dữ liệu giá cho vật tư này</div>
      ) : (
        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[480px] text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
                <th className="p-4 font-bold">Ngày báo giá</th>
                <th className="p-4 font-bold">Đơn giá</th>
                <th className="p-4 font-bold">Nhà cung cấp</th>
                <th className="p-4 font-bold">Khu vực</th>
                <th className="p-4 font-bold">Nguồn</th>
              </tr>
            </thead>
            <tbody className="text-xs text-white">
              {prices.map(p => (
                <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="p-4 font-mono">{new Date(p.priceDate).toLocaleDateString('vi-VN')}</td>
                  <td className="p-4 font-bold text-emerald-400 font-mono">{p.price.toLocaleString('vi-VN')} đ</td>
                  <td className="p-4 text-gray-300">{p.supplier || '—'}</td>
                  <td className="p-4 text-gray-400">{p.region || '—'}</td>
                  <td className="p-4 text-amber-400/80 uppercase text-[10px]">{p.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && (
        <ImportDialog
          kind="market-prices"
          onClose={() => setShowImport(false)}
          onDone={() => { loadPrices(selectedMaterial); setStaleKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
