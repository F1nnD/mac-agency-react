import React, { useEffect, useState } from 'react';
import { dataApi } from '../../utils/apiClient';

export default function ConceptsTab() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const res = await dataApi.getConcepts();
      setConcepts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, []);

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
            Concept Management
          </span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">
            Quản lý Ý tưởng Khách hàng
          </h1>
        </div>
        <button onClick={fetchConcepts} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:border-white transition-all">Tải lại</button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải...</div>
      ) : concepts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm">Chưa có concept nào</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {concepts.map(c => (
            <div key={c._id} className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Style Concept</span>
                    <h3 className="text-lg font-bold text-white">{c.style}</h3>
                  </div>
                  <span className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-[9px] px-2 py-1 rounded uppercase font-bold">
                    {c.spaceType}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* MÀU SẮC */}
                  <div>
                    <span className="text-gray-500 block mb-2 text-[10px] uppercase tracking-widest">Màu chủ đạo</span>
                    <div className="flex gap-2">
                      {c.mainColors?.map((color, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: color }} title={color}></div>
                      ))}
                    </div>
                  </div>

                  {/* CHẤT LIỆU */}
                  <div>
                    <span className="text-gray-500 block mb-2 text-[10px] uppercase tracking-widest">Chất liệu</span>
                    <div className="flex flex-wrap gap-2">
                      {c.mainMaterials?.map((mat, i) => (
                        <span key={i} className="bg-black/40 border border-white/10 px-2 py-1 rounded text-[10px] text-gray-300">{mat}</span>
                      ))}
                    </div>
                  </div>

                  {/* NGÂN SÁCH */}
                  <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 mt-4">
                    <span className="text-[9px] uppercase tracking-widest text-amber-400/60 block mb-1">Ngân sách dự kiến</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">{c.estimatedBudget ? c.estimatedBudget.toLocaleString('vi-VN') + ' đ' : 'Chưa nhập'}</span>
                  </div>
                </div>
              </div>

              {c.description && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1">Mô tả ý tưởng</span>
                  <p className="text-xs text-neutral-400 italic line-clamp-3">"{c.description}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}