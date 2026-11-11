import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const UPDATED = '12/11/2026';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}

function Ul({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}

export default function Terms() {
  return (
    <div className="w-full min-h-dvh bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      <Header showBackBtn={true} />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 space-y-8">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          Văn bản mẫu, cần luật sư rà soát trước khi công bố.
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Điều khoản sử dụng</h1>
          <p className="text-sm text-neutral-500">Cập nhật lần cuối: {UPDATED} · Phiên bản 2026-11</p>
        </header>

        <Section title="1. Chấp nhận điều khoản">
          <p>
            Khi đăng ký hoặc sử dụng website và các tính năng AI của MAC Concept, bạn đồng ý với các điều khoản này và với{' '}
            <Link to="/privacy" className="text-amber-400 underline">Chính sách quyền riêng tư</Link>. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
          </p>
          <Ul items={[
            'Đơn vị cung cấp: [CẦN BỔ SUNG: tên pháp nhân / hộ kinh doanh]',
            'Mã số thuế / giấy phép kinh doanh: [CẦN BỔ SUNG: số đăng ký]',
            'Địa chỉ: 44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP.HCM · Điện thoại 0375075975 · Email maconcept.asia@gmail.com'
          ]} />
        </Section>

        <Section title="2. Tài khoản">
          <Ul items={[
            'Bạn cung cấp thông tin chính xác (đặc biệt là email để khôi phục mật khẩu) và giữ bí mật mật khẩu.',
            'Bạn chịu trách nhiệm cho hoạt động dưới tài khoản của mình; hãy báo ngay nếu nghi ngờ bị truy cập trái phép.',
            'Hệ thống tạm khoá đăng nhập khi nhập sai mật khẩu nhiều lần liên tiếp để bảo vệ tài khoản.',
            'Chúng tôi có quyền khoá tài khoản vi phạm điều khoản hoặc có dấu hiệu lạm dụng.'
          ]} />
        </Section>

        <Section title="3. Tính năng AI và kết quả diễn hoạ">
          <Ul items={[
            'Phân tích mặt bằng, gợi ý concept, dự toán sơ bộ và ảnh diễn hoạ do AI tạo ra chỉ mang tính tham khảo, không phải bản vẽ kỹ thuật, hồ sơ thiết kế hay báo giá chính thức.',
            'Kết quả AI có thể chưa chính xác hoặc khác thực tế thi công. Cần khảo sát hiện trạng và thống nhất bằng hợp đồng trước khi thực hiện.',
            'Mỗi loại tài khoản có hạn mức sử dụng AI riêng; chúng tôi có thể điều chỉnh hạn mức khi cần.',
            'Dữ liệu bạn nhập được chuyển tới các bên xử lý thứ ba như mô tả trong Chính sách quyền riêng tư.'
          ]} />
        </Section>

        <Section title="4. Nội dung bạn tải lên">
          <Ul items={[
            'Bạn cam đoan có quyền sử dụng ảnh và thông tin tải lên, và không vi phạm quyền của người khác.',
            'Bạn cho phép MAC Concept lưu trữ, xử lý và dùng nội dung đó để cung cấp dịch vụ cho bạn (phân tích, diễn hoạ, tư vấn).',
            'Không tải lên nội dung trái pháp luật, xúc phạm, mã độc hoặc ảnh người nhận dạng được mà không có sự đồng ý của họ.'
          ]} />
        </Section>

        <Section title="5. Liên hệ tư vấn">
          <p>
            Khi để lại số điện thoại hoặc đồng ý khi đăng ký, bạn đồng ý để bộ phận tư vấn của MAC Concept liên hệ lại. Bạn có thể rút lại sự đồng ý bất cứ lúc nào bằng cách liên hệ chúng tôi hoặc xoá tài khoản.
          </p>
        </Section>

        <Section title="6. Hành vi bị cấm">
          <Ul items={[
            'Dò mật khẩu, tấn công, can thiệp hoặc làm gián đoạn hệ thống.',
            'Dùng công cụ tự động để vượt hạn mức hoặc thu thập dữ liệu hàng loạt.',
            'Chia sẻ tài khoản cho nhiều người hoặc mạo danh người khác.'
          ]} />
        </Section>

        <Section title="7. Sở hữu trí tuệ">
          <p>
            Giao diện, nội dung, hình ảnh dự án và thương hiệu MAC Concept thuộc quyền của chúng tôi hoặc bên cấp phép; bạn không được sao chép, phân phối lại khi chưa được đồng ý bằng văn bản. Quyền sử dụng ảnh diễn hoạ AI tạo cho công trình của bạn: [CẦN BỔ SUNG: điều khoản về quyền sử dụng ảnh diễn hoạ].
          </p>
        </Section>

        <Section title="8. Giới hạn trách nhiệm">
          <p>
            Dịch vụ được cung cấp trên cơ sở &quot;nguyên trạng&quot;. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc dựa vào kết quả AI hoặc từ gián đoạn dịch vụ. Mức giới hạn cụ thể: [CẦN BỔ SUNG: nội dung do luật sư soạn].
          </p>
        </Section>

        <Section title="9. Thay đổi, chấm dứt và luật áp dụng">
          <Ul items={[
            'Chúng tôi có thể cập nhật điều khoản; ngày và phiên bản được ghi ở đầu trang. Tiếp tục sử dụng nghĩa là bạn chấp nhận bản cập nhật.',
            'Bạn có thể xoá tài khoản bất cứ lúc nào trong trang Chính sách quyền riêng tư.',
            'Điều khoản này chịu sự điều chỉnh của pháp luật Việt Nam. Cơ quan giải quyết tranh chấp: [CẦN BỔ SUNG: toà án / trọng tài có thẩm quyền].'
          ]} />
        </Section>

        <p className="text-sm text-neutral-500 pt-4 border-t border-white/10">
          Câu hỏi về điều khoản: 0375075975 · maconcept.asia@gmail.com
        </p>
      </main>
    </div>
  );
}
