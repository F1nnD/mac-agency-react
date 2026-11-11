import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseCsv, readFileText } from '../../utils/csv';
import { importApi, formatMoney } from '../../utils/apiCrm';

const KINDS = {
  materials: {
    title: 'Nhập vật tư từ file',
    template: 'materials',
    filename: 'mau-nhap-vat-tu.csv',
    run: importApi.materials,
    hint: 'Mỗi dòng là một vật tư. Mã vật tư đã có thì cập nhật, chưa có thì tạo mới. Ô để trống sẽ giữ nguyên giá trị cũ.'
  },
  'market-prices': {
    title: 'Nhập báo giá từ file',
    template: 'market-prices',
    filename: 'mau-nhap-bao-gia.csv',
    run: importApi.marketPrices,
    hint: 'Mỗi dòng là một báo giá cho một vật tư (theo materialCode). Cần nhập vật tư trước. Không ghi ngày thì lấy hôm nay.'
  }
};

const MAX_ROWS = 500;
const btn = 'min-h-[44px] px-5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40';

export default function ImportDialog({ kind = 'materials', onClose, onDone }) {
  const cfg = KINDS[kind];
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null); // kết quả dryRun
  const [done, setDone] = useState(null); // kết quả ghi thật
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setRows([]); setPreview(null); setDone(null); setFileName(''); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setPreview(null); setDone(null);
    setFileName(file.name);
    try {
      const text = await readFileText(file);
      const { records } = parseCsv(text);
      if (!records.length) throw new Error('File không có dòng dữ liệu nào (cần dòng tiêu đề và ít nhất một dòng).');
      if (records.length > MAX_ROWS) throw new Error(`File có ${records.length} dòng, tối đa ${MAX_ROWS} dòng mỗi lần. Hãy tách file.`);
      setRows(records);
      setBusy(true);
      const res = await cfg.run(records, true);
      setPreview(res.data);
    } catch (err) {
      setRows([]);
      setError(err.message || 'Không đọc được file.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true); setError('');
    try {
      const res = await cfg.run(rows, false);
      setDone(res.data);
      setPreview(null);
      if (onDone) onDone(res.data);
    } catch (err) {
      setError(err.message || 'Không ghi được dữ liệu.');
    } finally {
      setBusy(false);
    }
  };

  const handleTemplate = async () => {
    try { await importApi.downloadTemplate(cfg.template, cfg.filename); }
    catch (err) { setError(err.message); }
  };

  const shown = preview ? preview.results.filter(r => !onlyErrors || !r.ok) : [];
  const validCount = preview ? preview.created + preview.updated : 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/80 md:flex md:items-center md:justify-center md:p-4" onClick={onClose}>
      <div
        className="bg-zinc-950 border-white/10 md:border md:rounded-2xl w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 p-5 border-b border-white/5 shrink-0">
          <div>
            <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Import</span>
            <h2 className="text-lg font-bold text-white uppercase mt-1">{cfg.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-11 h-11 shrink-0 text-white/50 hover:text-white rounded-xl border border-white/10 text-lg">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {!done && (
            <>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[11px] text-gray-400 leading-relaxed space-y-2">
                <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">Cách làm</p>
                <p>1. Tải file mẫu, mở bằng Excel và điền dữ liệu theo đúng cột.</p>
                <p>2. Trong Excel chọn <span className="text-amber-400">Lưu thành (Save As) → CSV UTF-8 (Comma delimited)</span> để không lỗi tiếng Việt.</p>
                <p>3. Chọn file bên dưới, xem trước kết quả rồi mới xác nhận ghi.</p>
                <p className="text-gray-500">{cfg.hint} Tối đa {MAX_ROWS} dòng mỗi lần.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleTemplate} className={`${btn} border border-white/10 bg-black/20 text-white hover:border-white`}>Tải file mẫu</button>
                <label className={`${btn} bg-amber-400 text-black hover:bg-amber-300 cursor-pointer flex items-center justify-center`}>
                  {fileName ? 'Chọn file khác' : 'Chọn file .csv'}
                  <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" onChange={handleFile} className="hidden" />
                </label>
              </div>
              {fileName && <p className="text-[11px] text-gray-500 font-mono break-all">{fileName}{rows.length ? ` · ${rows.length} dòng` : ''}</p>}
            </>
          )}

          {busy && <p className="text-white/40 text-xs uppercase tracking-widest text-center py-6">Đang xử lý...</p>}
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>}

          {preview && !busy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Tạo mới" value={preview.created} cls="text-emerald-400" />
                <Stat label="Cập nhật" value={preview.updated} cls="text-cyan-400" />
                <Stat label="Lỗi (bỏ qua)" value={preview.failed} cls={preview.failed ? 'text-red-400' : 'text-gray-500'} />
                <Stat label="Tổng dòng" value={preview.total} cls="text-white" />
              </div>

              {preview.failed > 0 && (
                <button onClick={() => setOnlyErrors(v => !v)} className="min-h-[44px] text-[10px] font-bold uppercase tracking-widest text-amber-400 underline">
                  {onlyErrors ? 'Hiện tất cả dòng' : 'Chỉ hiện dòng lỗi'}
                </button>
              )}

              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse min-w-[420px]">
                  <thead>
                    <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-gray-400">
                      <th className="p-3">Dòng</th>
                      <th className="p-3">{kind === 'materials' ? 'Mã / Tên' : 'Mã / Giá'}</th>
                      <th className="p-3">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {shown.map(r => (
                      <tr key={r.row} className="border-t border-white/5 align-top">
                        <td className="p-3 font-mono text-gray-500">{r.row}</td>
                        <td className="p-3 text-white">
                          <span className="font-mono text-amber-400">{r.code || '—'}</span>
                          <span className="block text-gray-400">{kind === 'materials' ? r.name : r.price ? formatMoney(r.price) : ''}</span>
                        </td>
                        <td className="p-3">
                          {r.ok ? (
                            <span className={r.action === 'create' ? 'text-emerald-400' : 'text-cyan-400'}>{r.action === 'create' ? 'Tạo mới' : 'Cập nhật'}</span>
                          ) : (
                            <ul className="text-red-400 space-y-1">{r.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
                          )}
                        </td>
                      </tr>
                    ))}
                    {shown.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">Không có dòng nào.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {done && (
            <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-5 space-y-2 text-xs">
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Đã ghi dữ liệu</p>
              <p className="text-white">Tạo mới {done.created} · Cập nhật {done.updated}{done.failed ? ` · Bỏ qua ${done.failed} dòng lỗi` : ''}.</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
          {done ? (
            <>
              <button onClick={reset} className={`${btn} border border-white/10 text-white`}>Nhập file khác</button>
              <button onClick={onClose} className={`${btn} bg-white text-black`}>Xong</button>
            </>
          ) : (
            <>
              <button onClick={onClose} className={`${btn} border border-white/10 text-white`}>Huỷ</button>
              <button onClick={handleConfirm} disabled={busy || !preview || validCount === 0} className={`${btn} bg-emerald-400 text-black hover:bg-emerald-300`}>
                {preview && validCount > 0 ? `Xác nhận ghi ${validCount} dòng` : 'Xác nhận ghi'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, cls }) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3 text-center">
      <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{label}</p>
      <p className={`text-xl font-bold font-mono mt-1 ${cls}`}>{value}</p>
    </div>
  );
}
