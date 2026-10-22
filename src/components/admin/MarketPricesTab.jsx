import React, { useEffect, useState } from 'react';
import { dataApi } from '../../utils/apiClient';

export default function MarketPricesTab() {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Tải giá khi chọn vật tư
  useEffect(() => {
    if (!selectedMaterial) return;
    async function loadPrices() {
      setLoading(true);
      try {
        const res = await dataApi.getMarketPrices(selectedMaterial);
        setPrices(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPrices();
  }, [selectedMaterial]);

  const currentMat = materials.find(m => m._id === selectedMaterial);

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Market Price Management</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Giá Thị Trường Vật Tư</h1>
        </div>
      </div>

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
        <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-xl flex gap-6">
          <div><span className="text-[10px] text-gray-500 uppercase">ĐVT:</span> <span className="text-white font-mono text-xs">{currentMat.unit}</span></div>
          <div><span className="text-[10px] text-gray-500 uppercase">Phân loại:</span> <span className="text-white text-xs">{currentMat.category}</span></div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải...</div>
      ) : prices.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm">Chưa có dữ liệu giá cho vật tư này</div>
      ) : (
        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
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
    </div>
  );
}