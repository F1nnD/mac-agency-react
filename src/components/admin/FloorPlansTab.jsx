import React, { useEffect, useState } from 'react';
import { dataApi } from '../../utils/apiClient';

export default function FloorPlansTab() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFP, setSelectedFP] = useState(null);

  const fetchFloorPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dataApi.getFloorPlans();
      setFloorPlans(res.data || []);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách mặt bằng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorPlans();
  }, []);

  return (
    <div className="tab-content-anim space-y-8 w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
            Floor Plan Management
          </span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">
            Quản lý Mặt Bằng Khách Hàng
          </h1>
        </div>
        <button
          onClick={fetchFloorPlans}
          className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:border-white transition-all cursor-pointer"
        >
          Tải lại
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs tracking-widest uppercase">
          Đang tải dữ liệu...
        </div>
      ) : floorPlans.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/40 text-sm">Chưa có mặt bằng nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floorPlans.map(fp => (
            <div key={fp._id} className="bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/20 transition-all flex flex-col">
              {/* ẢNH */}
              <div className="w-full aspect-[4/3] bg-neutral-900 relative">
                {fp.images && fp.images.length > 0 ? (
                  <img src={fp.images[0]} alt={fp.projectName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white/20 italic">
                    Không có ảnh
                  </div>
                )}
                {fp.images && fp.images.length > 1 && (
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded">
                    +{fp.images.length - 1} ảnh
                  </span>
                )}
              </div>

              {/* NỘI DUNG */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase truncate">{fp.projectName}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 truncate">{fp.address}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                      <span className="text-gray-500 block">Diện tích</span>
                      <span className="text-amber-400 font-bold font-mono">{fp.totalArea} m²</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                      <span className="text-gray-500 block">Loại</span>
                      <span className="text-white font-semibold">
                        {fp.siteStatus === 'dat-trong' ? 'Đất trống' : 'Có nhà'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFP(fp)}
                  className="w-full mt-4 border border-white/10 bg-black/20 text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-white hover:text-black transition-all"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      {selectedFP && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedFP(null)}>
          <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-950 border-b border-white/5 p-5 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-white uppercase">{selectedFP.projectName}</h2>
              <button onClick={() => setSelectedFP(null)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* ALBUM ẢNH */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Hình ảnh hiện trạng</h3>
                {selectedFP.images && selectedFP.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedFP.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer" className="aspect-square bg-black rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all">
                        <img src={img} alt={`Ảnh ${i+1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">Không có ảnh</p>
                )}
              </div>

              {/* THÔNG TIN */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Thông tin chi tiết</h3>
                <div className="space-y-2 text-xs bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Kích thước:</span>
                    <span className="text-white font-mono">{selectedFP.width}m x {selectedFP.length}m = {selectedFP.totalArea} m²</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Địa chỉ:</span>
                    <span className="text-white">{selectedFP.address}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Khu vực:</span>
                    <span className="text-white">{selectedFP.district}, {selectedFP.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hiện trạng:</span>
                    <span className="text-amber-400 font-semibold">{selectedFP.siteStatus === 'dat-trong' ? 'Đất trống' : 'Có nhà trên đất'}</span>
                  </div>
                </div>
              </div>

              {/* GHI CHÚ */}
              {selectedFP.notes && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Ghi chú của khách</h3>
                  <p className="text-xs text-neutral-400 bg-black/40 border border-white/5 rounded-xl p-4 italic">"{selectedFP.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}