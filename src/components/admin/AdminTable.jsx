import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Thành phần dùng chung cho các tab quản trị:
 *  - AdminTable: dưới md hiện dạng thẻ, từ md trở lên là bảng
 *  - TableSkeleton / EmptyState / ErrorState: trạng thái tải, rỗng, lỗi (có nút "Thử lại")
 *  - useToast: thông báo ngắn tự tắt (thành công / thất bại)
 */

// ---------------------------------------------------------------
// Trạng thái tải / rỗng / lỗi
// ---------------------------------------------------------------
export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-4 space-y-3 motion-safe:animate-pulse">
          <div className="h-3 w-2/5 rounded bg-white/10" />
          <div className="h-2 w-3/5 rounded bg-white/5" />
          <div className="h-2 w-1/4 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children = 'Chưa có dữ liệu', action }) {
  return (
    <div className="text-center py-14 px-4 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm space-y-4">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <span className="break-words">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 shrink-0 border border-red-400/40 text-red-300 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Toast tự tắt. Dùng: const { toast, node } = useToast(); toast('Đã lưu'); ... render {node}
// Toast nằm cố định ở đáy màn hình, không dùng transform/blur để tránh lỗi nhốt phần tử fixed.
// ---------------------------------------------------------------
export function useToast(duration = 3000) {
  const [item, setItem] = useState(null);
  const timer = useRef(null);

  const toast = useCallback((text, type = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setItem({ text, type, id: Date.now() });
    timer.current = setTimeout(() => setItem(null), duration);
  }, [duration]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const body = item ? (
    <div
      key={item.id}
      role={item.type === 'error' ? 'alert' : 'status'}
      className="fixed left-4 right-4 bottom-20 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-[60] pointer-events-none"
    >
      <div
        className={`pointer-events-auto text-xs font-bold px-4 py-3 rounded-xl border shadow-lg ${
          item.type === 'error'
            ? 'bg-red-950 border-red-500/40 text-red-300'
            : 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
        }`}
      >
        {item.text}
      </div>
    </div>
  ) : null;

  // Đưa ra thẳng <body> để không bị nhốt trong phần tử có transform/blur
  const node = body && typeof document !== 'undefined' ? createPortal(body, document.body) : null;

  return { toast, node };
}

// ---------------------------------------------------------------
// AdminTable
// columns: [{ key, label, render?(row, index), primary?, hideOnMobile?, align?: 'left'|'center'|'right', className? }]
// actions: (row) => node  -> cột "Thao tác" trên bảng, cuối thẻ trên điện thoại
// rowClassName: (row) => string
// ---------------------------------------------------------------
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

export default function AdminTable({
  columns,
  rows,
  rowKey = (r, i) => r._id || i,
  actions,
  actionsLabel = 'Thao tác',
  rowClassName,
  emptyText = 'Chưa có dữ liệu',
  loading = false,
  error = '',
  onRetry,
  className = ''
}) {
  if (loading) return <TableSkeleton />;
  if (error && (!rows || rows.length === 0)) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  const cell = (col, row, i) => (col.render ? col.render(row, i) : row[col.key]);
  const primary = columns.find(c => c.primary) || columns[0];
  const secondary = columns.filter(c => c !== primary && !c.hideOnMobile);

  return (
    <div className={className}>
      {/* THẺ: dưới md */}
      <ul className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <li
            key={rowKey(row, i)}
            className={`bg-zinc-900/20 border border-white/5 rounded-2xl p-4 space-y-3 ${rowClassName ? rowClassName(row) : ''}`}
          >
            <div className="text-sm font-bold text-white break-words">{cell(primary, row, i)}</div>
            {secondary.length > 0 && (
              <dl className="space-y-2">
                {secondary.map(col => (
                  <div key={col.key} className="flex items-center justify-between gap-4 text-xs">
                    <dt className="text-[10px] uppercase tracking-widest text-white/30 font-bold shrink-0">{col.label}</dt>
                    <dd className="text-white text-right min-w-0 break-words">{cell(col, row, i)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">{actions(row, i)}</div>}
          </li>
        ))}
      </ul>

      {/* BẢNG: từ md; cuộn ngang an toàn trong khung */}
      <div className="hidden md:block bg-zinc-900/20 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
              {columns.map(col => (
                <th key={col.key} className={`p-4 font-bold whitespace-nowrap ${ALIGN[col.align] || ''}`}>{col.label}</th>
              ))}
              {actions && <th className="p-4 font-bold text-right whitespace-nowrap">{actionsLabel}</th>}
            </tr>
          </thead>
          <tbody className="text-xs text-white">
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${rowClassName ? rowClassName(row) : ''}`}>
                {columns.map(col => (
                  <td key={col.key} className={`p-4 ${ALIGN[col.align] || ''} ${col.className || ''}`}>{cell(col, row, i)}</td>
                ))}
                {actions && <td className="p-4"><div className="flex justify-end gap-2">{actions(row, i)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
