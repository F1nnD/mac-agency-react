// Kiến thức thiết kế dùng chung cho AI thường (miễn phí), AI Studio và bộ quy tắc dự phòng.
// Mục tiêu: AI nói bằng ngôn ngữ thiết kế chính xác, không chung chung.

const STYLE_GUIDE = {
  Industrial: {
    en: 'industrial loft',
    terms: ['bề mặt vật liệu thô', 'kết cấu lộ thiên', 'tương phản vật liệu', 'trần cao mở', 'chiếu sáng điểm nhấn'],
    palette: 'xám bê tông, đen nhám, nâu gỗ ấm, điểm nhấn đồng hoặc cam gạch',
    materials: 'bê tông trần, thép sơn tĩnh điện, gạch thẻ, gỗ tái chế',
    lighting: 'đèn thả dây điện, đèn ray rọi hắt vào mảng tường thô, ánh sáng vàng ấm 2700-3000K',
    en_keywords: 'exposed concrete, black steel frames, exposed brick, Edison pendant lights, high ceiling'
  },
  Minimalism: {
    en: 'minimalist',
    terms: ['tỷ lệ và khoảng trống', 'đường nét tối giản', 'nhịp điệu giản lược', 'mặt phẳng liền khối', 'ánh sáng tự nhiên là chủ đạo'],
    palette: 'trắng, be, xám sáng, một màu nhấn duy nhất',
    materials: 'sơn mịn, gỗ sáng vân nhỏ, đá mài, kính trong',
    lighting: 'ánh sáng tự nhiên tối đa, đèn âm trần và đèn hắt trần ánh sáng trung tính 3500K',
    en_keywords: 'clean lines, negative space, white walls, light oak, concealed storage, soft daylight'
  },
  Vintage: {
    en: 'vintage',
    terms: ['chi tiết phào chỉ', 'hoạ tiết cổ điển', 'bề mặt có dấu thời gian', 'nhấn bằng đồ sưu tầm', 'lớp màu trầm'],
    palette: 'nâu trầm, xanh rêu, đỏ rượu vang, kem ngà',
    materials: 'gỗ sẫm màu, gạch bông, đồng thau, vải nhung',
    lighting: 'đèn bàn và đèn tường ánh vàng, chao đèn vải, ánh sáng ấm 2400-2700K',
    en_keywords: 'vintage furniture, patterned cement tiles, brass fixtures, velvet upholstery, warm lamps'
  },
  Retro: {
    en: 'retro',
    terms: ['bảng màu đậm đặc trưng một thời kỳ', 'hình khối bo tròn', 'vật liệu bóng', 'hoạ tiết hình học', 'nhấn bằng bảng hiệu neon'],
    palette: 'cam cháy, vàng mù tạt, xanh bơ, kem',
    materials: 'terrazzo, formica, nhựa bóng, kim loại mạ crom',
    lighting: 'đèn neon và đèn tròn lộ bóng, ánh sáng màu điểm nhấn',
    en_keywords: 'retro 70s, terrazzo floor, rounded furniture, mustard and orange palette, neon sign'
  },
  Japandi: {
    en: 'japandi',
    terms: ['wabi-sabi', 'sự tĩnh tại', 'vật liệu tự nhiên tối giản', 'tỷ lệ thấp và gần mặt đất', 'bố cục phi đối xứng'],
    palette: 'be, nâu gỗ, xám đá, xanh lá dịu, đen mực làm điểm nhấn',
    materials: 'gỗ sồi, tre, mây, vải lanh, gốm thủ công',
    lighting: 'ánh sáng khuếch tán qua rèm mỏng, đèn giấy washi, 2700-3000K',
    en_keywords: 'japandi, warm oak, rattan, linen, low furniture, paper lantern, calm earth tones'
  },
  'Modern Classic': {
    en: 'modern classic',
    terms: ['đối xứng và trục thị giác', 'phào chỉ tân cổ điển giản lược', 'tỷ lệ vàng', 'vật liệu cao cấp', 'điểm nhấn trung tâm'],
    palette: 'trắng ngà, vàng champagne, xanh navy, xám lụa',
    materials: 'đá marble, gỗ óc chó, đồng, kính ốp, vải bọc cao cấp',
    lighting: 'đèn chùm điểm nhấn, đèn hắt trần, ánh sáng nhiều lớp 3000K',
    en_keywords: 'neoclassical mouldings, marble, champagne gold accents, symmetrical layout, chandelier'
  },
  'Tropical Eco': {
    en: 'tropical eco',
    terms: ['thông gió tự nhiên', 'ranh giới trong - ngoài mờ', 'mảng xanh xen kẽ', 'vật liệu địa phương', 'mái đua chống nắng'],
    palette: 'xanh lá, nâu đất, be cát, trắng vôi',
    materials: 'gỗ, tre, gạch nung, đá tự nhiên, cây xanh',
    lighting: 'lấy sáng tự nhiên từ giếng trời, đèn rattan, 2700K',
    en_keywords: 'tropical architecture, lush greenery, bamboo, terracotta, open air, natural ventilation'
  },
  Scandinavian: {
    en: 'scandinavian',
    terms: ['hygge', 'công năng đi trước hình thức', 'tối đa ánh sáng ban ngày', 'bề mặt dịu và ấm', 'nội thất chân cao'],
    palette: 'trắng, xám nhạt, gỗ bạch dương, xanh pastel',
    materials: 'gỗ sáng, len, vải bông, kim loại mảnh',
    lighting: 'cửa sổ lớn, đèn treo hình học đơn giản, 3000K',
    en_keywords: 'scandinavian, birch wood, white walls, wool textiles, cozy daylight, functional furniture'
  },
  Bohemian: {
    en: 'bohemian',
    terms: ['phối lớp hoạ tiết', 'màu sắc đa tầng', 'đồ thủ công', 'bố cục tự do', 'cây xanh làm điểm nhấn'],
    palette: 'đỏ đất, vàng nghệ, xanh ngọc, cam',
    materials: 'mây tre, vải dệt thủ công, gỗ, gốm',
    lighting: 'đèn lồng, đèn dây, ánh sáng ấm nhiều nguồn thấp',
    en_keywords: 'bohemian, layered textiles, macrame, rattan, plants, eclectic patterns, warm string lights'
  },
  Other: {
    en: 'contemporary',
    terms: ['bố cục theo công năng', 'tỷ lệ hài hoà', 'ánh sáng nhiều lớp'],
    palette: 'theo bảng màu khách chọn',
    materials: 'theo chất liệu khách chọn',
    lighting: 'ánh sáng nhiều lớp, điều chỉnh theo công năng',
    en_keywords: 'contemporary design, balanced proportions, layered lighting'
  }
};

const SPACE_TYPE_EN = {
  'Nhà Ở': 'residential house',
  'Nhà Phố': 'narrow townhouse',
  'Biệt Thự': 'luxury villa',
  'Quán Kafe': 'coffee shop',
  'Nhà Hàng': 'restaurant',
  'Bar': 'cocktail bar and lounge',
  'Văn Phòng': 'office space',
  'Khách Sạn': 'boutique hotel',
  'Khác': 'commercial space'
};

const MATERIAL_EN = {
  'Bê tông': 'exposed concrete',
  'Gỗ tự nhiên': 'natural wood',
  'Kim loại': 'metal',
  'Kính': 'glass',
  'Đá tự nhiên': 'natural stone',
  'Gạch': 'brick and tile',
  'Thép': 'steel',
  'Nhựa': 'polished plastic',
  'Vải': 'fabric',
  'Da': 'leather'
};

function getStyleGuide(style) {
  return STYLE_GUIDE[style] || STYLE_GUIDE.Other;
}

// Đổi mã màu hex thành tên màu tiếng Anh gần đúng để đưa vào prompt ảnh
function hexToColorName(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return String(hex || '').trim();
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d < 0.08) {
    if (l > 0.92) return 'white';
    if (l > 0.7) return 'light grey';
    if (l > 0.4) return 'grey';
    if (l > 0.15) return 'charcoal';
    return 'black';
  }

  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;

  const s = d / (1 - Math.abs(2 * l - 1));
  const tone = l > 0.75 ? 'light ' : l < 0.3 ? 'dark ' : '';
  let name;
  if (h < 15 || h >= 345) name = 'red';
  else if (h < 40) name = s < 0.5 && l < 0.5 ? 'brown' : 'orange';
  else if (h < 65) name = 'yellow';
  else if (h < 165) name = 'green';
  else if (h < 200) name = 'teal';
  else if (h < 260) name = 'blue';
  else if (h < 300) name = 'purple';
  else name = 'pink';
  if (name === 'orange' && l < 0.5) name = 'brown';
  if (name === 'yellow' && l < 0.45) name = 'olive';
  return `${tone}${name}`.trim();
}

// =============================================================
// SYSTEM PROMPT
// =============================================================
const FREE_CHAT_SYSTEM = `Bạn là trợ lý tư vấn thiết kế của MAC Concept (TP.HCM), chuyên thiết kế - thi công không gian F&B, nhà phố và thương mại.

CÁCH TRẢ LỜI
- Xưng "mình", gọi khách là "bạn" hoặc "anh/chị". Trả lời bằng tiếng Việt, tối đa khoảng 150 từ trừ khi khách hỏi sâu.
- Dùng đúng thuật ngữ thiết kế khi phù hợp (tỷ lệ, trục thị giác, nhịp điệu, tương phản vật liệu, lớp ánh sáng, độ mở không gian, lưu tuyến...) và giải thích ngắn gọn bằng lời dễ hiểu ngay sau thuật ngữ.
- Khi nói về một phong cách, nêu được: tinh thần cốt lõi, bảng màu, vật liệu đặc trưng, cách bố trí ánh sáng, và một lưu ý khi áp dụng vào mặt bằng thực tế của khách.
- Với mặt bằng hẹp (nhà ống), ưu tiên gợi ý: lấy sáng và thông gió bằng giếng trời, thông tầng, vách kính, bố trí lưu tuyến thẳng.

GIỚI HẠN
- Không bịa số liệu. Không báo giá cố định: khi hỏi chi phí, chỉ nêu khoảng tham khảo rất sơ bộ và mời khách dùng tính năng AI Studio để có phối cảnh và dự toán sơ bộ theo đúng mặt bằng của mình.
- Không hứa thời gian thi công hay cam kết pháp lý (giấy phép xây dựng, quy hoạch). Với các việc đó, mời khách để lại thông tin để kiến trúc sư MAC tư vấn.
- Nếu câu hỏi ngoài lĩnh vực thiết kế - thi công, từ chối lịch sự và quay lại chủ đề.`;

const PRO_CHAT_SYSTEM = `Bạn là Kiến trúc sư trưởng của MAC Concept. Trao đổi với đồng nghiệp nội bộ bằng tiếng Việt chuyên ngành, đi thẳng vào vấn đề.
Có thể phân tích kết cấu, vật liệu, định mức, dự toán BOQ, bố trí công năng và đề xuất phương án thi công.
Khi đưa số liệu, nêu rõ giả định (diện tích, hệ số, đơn giá tham chiếu) và đánh dấu phần chưa chắc chắn. Không bịa số liệu; nếu thiếu dữ liệu, nói rõ cần bổ sung gì.`;

module.exports = {
  STYLE_GUIDE,
  SPACE_TYPE_EN,
  MATERIAL_EN,
  FREE_CHAT_SYSTEM,
  PRO_CHAT_SYSTEM,
  getStyleGuide,
  hexToColorName
};
