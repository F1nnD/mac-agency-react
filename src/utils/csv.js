// =============================================================
// Đọc file CSV xuất từ Excel (không phụ thuộc thư viện ngoài)
//  - tự nhận dấu phân cách "," hoặc ";" (Excel tiếng Việt hay dùng ;)
//  - xử lý ngoặc kép, ngoặc kép lồng "", xuống dòng trong ô, BOM UTF-8
//  - đổi số kiểu Việt: 1.200.000 / 1,5 / 1200000đ
// =============================================================

export function stripBom(text) {
  return String(text ?? '').replace(/^﻿/, '');
}

// Đoán dấu phân cách từ dòng đầu (bỏ qua nội dung trong ngoặc kép)
export function detectDelimiter(text) {
  const firstLine = stripBom(text).split(/\r?\n/)[0] || '';
  let inQuotes = false;
  const count = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in count) count[ch] += 1;
  }
  if (count[';'] > count[','] && count[';'] >= count['\t']) return ';';
  if (count['\t'] > count[','] && count['\t'] > count[';']) return '\t';
  return ',';
}

// Trả về mảng các dòng, mỗi dòng là mảng ô (chuỗi)
export function parseCsvRows(text, delimiter) {
  const src = stripBom(text);
  const delim = delimiter || detectDelimiter(src);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }

  // Bỏ dòng trống hoàn toàn
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

// Dòng đầu là tiêu đề → mảng đối tượng { tiêu đề: giá trị }
export function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(h => String(h).trim());
  const records = rows.slice(1).map(cells => {
    const rec = {};
    headers.forEach((h, i) => {
      if (h) rec[h] = String(cells[i] ?? '').trim();
    });
    return rec;
  });
  return { headers, records };
}

// "1.200.000" → 1200000; "1,5" → 1.5; "1.200" → 1200; "0.25" → 0.25; sai → NaN
export function parseVnNumber(value) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').trim().toLowerCase();
  if (!s) return NaN;
  s = s.replace(/\s|vn[đd]|đ|₫|d$/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;

  const neg = s.startsWith('-');
  s = s.replace('-', '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    // Có cả hai: dấu xuất hiện sau cùng là dấu thập phân
    const dec = lastDot > lastComma ? '.' : ',';
    const thou = dec === '.' ? ',' : '.';
    s = s.split(thou).join('').replace(dec, '.');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    if (parts.length > 2) {
      // Nhiều dấu: hàng nghìn (1.200.000)
      if (!parts.slice(1).every(p => p.length === 3)) return NaN;
      s = parts.join('');
    } else if (parts[1].length === 3 && /^[1-9]\d{0,2}$/.test(parts[0])) {
      // 1.200 → 1200 (hàng nghìn); 0.125 vẫn là thập phân
      s = parts.join('');
    } else {
      s = `${parts[0]}.${parts[1]}`;
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

// Đọc File từ <input type="file"> thành văn bản UTF-8
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được file.'));
    reader.readAsText(file, 'utf-8');
  });
}
