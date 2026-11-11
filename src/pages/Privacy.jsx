import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCurrentUser } from '../utils/apiClient';
import { exportMyData, deleteMyAccount } from '../utils/apiAuth';

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

// Công cụ thực hiện quyền ngay trong hệ thống (chỉ hiện khi đã đăng nhập)
function MyDataTools() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');

  if (!user) {
    return (
      <p className="text-sm text-neutral-400">
        <Link to="/login" className="text-amber-400 underline">Đăng nhập</Link> để tải dữ liệu hoặc xoá tài khoản ngay tại đây.
      </p>
    );
  }
  const privileged = ['admin', 'staff'].includes(user.role);

  const doExport = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try { await exportMyData(); setMsg('Đã tải tệp dữ liệu của bạn về máy.'); }
    catch (e) { setErr(e.message || 'Không xuất được dữ liệu.'); }
    finally { setBusy(false); }
  };

  const doDelete = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      await deleteMyAccount(password);
      navigate('/');
    } catch (e2) {
      setErr(e2.message || 'Không xoá được tài khoản.');
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-4">
      <p className="text-sm text-gray-300">Đang đăng nhập: <b className="text-white">{user.username}</b></p>
      {msg && <div className="text-sm text-amber-300">{msg}</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button
        type="button"
        onClick={doExport}
        disabled={busy}
        className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold border-none cursor-pointer disabled:opacity-50"
      >
        Tải dữ liệu của tôi (JSON)
      </button>
      {privileged ? (
        <p className="text-sm text-neutral-400">Tài khoản quản trị/nhân viên không tự xoá được; vui lòng liên hệ quản trị viên.</p>
      ) : !confirming ? (
        <div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-semibold cursor-pointer"
          >
            Xoá tài khoản của tôi
          </button>
        </div>
      ) : (
        <form onSubmit={doDelete} className="space-y-3">
          <p className="text-sm text-red-300 leading-relaxed">
            Việc xoá không thể hoàn tác: mặt bằng, concept, ảnh diễn hoạ và thông tin liên hệ của bạn sẽ bị xoá. Nhập mật khẩu để xác nhận.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Mật khẩu hiện tại"
            className="w-full min-h-11 bg-zinc-900/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-red-400/60"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={busy} className="min-h-11 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50">
              Xác nhận xoá vĩnh viễn
            </button>
            <button type="button" onClick={() => { setConfirming(false); setPassword(''); }} className="min-h-11 px-5 rounded-xl bg-transparent border border-white/15 text-gray-300 text-sm cursor-pointer">
              Huỷ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="w-full min-h-dvh bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      <Header showBackBtn={true} />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 space-y-8">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          Văn bản mẫu, cần luật sư rà soát trước khi công bố.
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Chính sách quyền riêng tư</h1>
          <p className="text-sm text-neutral-500">Cập nhật lần cuối: {UPDATED} · Phiên bản 2026-11</p>
        </header>

        <Section title="1. Đơn vị xử lý dữ liệu">
          <p>
            Chính sách này áp dụng cho website và các tính năng AI của MAC Concept (sau đây gọi là &quot;MAC Concept&quot;, &quot;chúng tôi&quot;).
          </p>
          <Ul items={[
            'Tên pháp nhân: [CẦN BỔ SUNG: tên pháp nhân / hộ kinh doanh]',
            'Mã số thuế / mã số doanh nghiệp: [CẦN BỔ SUNG: mã số thuế]',
            'Địa chỉ liên hệ: 44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP.HCM',
            'Điện thoại: 0375075975 · Email: maconcept.asia@gmail.com',
            'Người phụ trách bảo vệ dữ liệu cá nhân: [CẦN BỔ SUNG: họ tên, chức danh]'
          ]} />
        </Section>

        <Section title="2. Dữ liệu chúng tôi thu thập">
          <Ul items={[
            'Tài khoản: tên đăng nhập, họ tên, email, mật khẩu (chỉ lưu dạng băm, chúng tôi không đọc được mật khẩu gốc).',
            'Hoạt động đăng nhập: số lần đăng nhập, thời điểm đăng nhập gần nhất, địa chỉ IP và thông tin trình duyệt trong nhật ký đăng nhập.',
            'Thông tin mặt bằng: diện tích, kích thước, hiện trạng công trình, ảnh hiện trạng bạn tải lên.',
            'Concept thiết kế: phong cách, màu sắc, ngân sách, nhu cầu bạn chọn hoặc mô tả.',
            'Ảnh diễn hoạ do AI tạo và lời nhắc (prompt) dùng để tạo ảnh.',
            'Thông tin liên hệ: họ tên, số điện thoại, email và lời nhắn khi bạn để lại thông tin nhận tư vấn.',
            'Nội dung tin nhắn gửi cho trợ lý AI và lượt sử dụng AI (để giới hạn hạn mức sử dụng).',
            'Điểm quan tâm: chúng tôi tính một điểm nội bộ từ mức độ bạn sử dụng hệ thống để bộ phận tư vấn ưu tiên liên hệ.'
          ]} />
        </Section>

        <Section title="3. Mục đích sử dụng">
          <Ul items={[
            'Cung cấp tài khoản, bảo mật đăng nhập và khôi phục mật khẩu qua email.',
            'Tư vấn thiết kế, thi công và dự toán cho công trình của bạn.',
            'Dùng AI để phân tích mặt bằng, gợi ý concept và diễn hoạ phối cảnh.',
            'Bộ phận telesale liên hệ lại qua điện thoại/email để tư vấn khi bạn đã để lại thông tin hoặc đồng ý khi đăng ký.',
            'Thống kê nội bộ để cải thiện dịch vụ và phòng chống lạm dụng.'
          ]} />
        </Section>

        <Section title="4. Bên thứ ba xử lý dữ liệu">
          <p>Để vận hành tính năng AI và lưu trữ, một phần dữ liệu của bạn được chuyển tới các nhà cung cấp sau (có thể đặt máy chủ ngoài Việt Nam):</p>
          <Ul items={[
            'Google Gemini: nhận ảnh hiện trạng, thông tin mặt bằng, concept và tin nhắn để AI phân tích, tư vấn.',
            'Pollinations: dịch vụ vẽ ảnh, nhận lời nhắc mô tả không gian để tạo ảnh diễn hoạ.',
            'Cloudinary: kho lưu trữ ảnh, chỉ dùng khi tính năng này được bật trong hệ thống.',
            'Dịch vụ gửi email (Resend): nhận địa chỉ email của bạn để gửi thư đặt lại mật khẩu.',
            'Máy chủ và cơ sở dữ liệu lưu trữ ứng dụng: [CẦN BỔ SUNG: tên nhà cung cấp hạ tầng và khu vực đặt máy chủ].'
          ]} />
          <p>Chúng tôi không bán dữ liệu cá nhân của bạn. Vui lòng không tải lên ảnh có người hoặc thông tin nhạy cảm không cần thiết cho việc thiết kế.</p>
        </Section>

        <Section title="5. Thời gian lưu trữ">
          <Ul items={[
            'Dữ liệu tài khoản, mặt bằng, concept, ảnh diễn hoạ và thông tin liên hệ được lưu cho đến khi bạn xoá tài khoản hoặc yêu cầu xoá.',
            'Nhật ký đăng nhập và lượt dùng AI phục vụ bảo mật, hạn mức: [CẦN BỔ SUNG: số tháng lưu trữ]. Khi bạn xoá tài khoản, các bản ghi này được gỡ liên kết và xoá IP, tên đăng nhập, nội dung tin nhắn.',
            'Liên kết đặt lại mật khẩu hết hạn sau 30 phút và chỉ dùng được một lần.',
            'Một số dữ liệu có thể được giữ lâu hơn nếu pháp luật yêu cầu.'
          ]} />
        </Section>

        <Section title="6. Quyền của bạn">
          <p>Bạn có quyền truy cập, chỉnh sửa, xoá dữ liệu, rút lại sự đồng ý và phản đối việc xử lý dữ liệu cá nhân của mình. Cách thực hiện:</p>
          <Ul items={[
            'Truy cập: tải toàn bộ dữ liệu của bạn dạng tệp JSON ngay bên dưới (cần đăng nhập).',
            'Chỉnh sửa: sửa thông tin mặt bằng, concept trong hệ thống, hoặc liên hệ chúng tôi để sửa thông tin tài khoản.',
            'Xoá / rút lại đồng ý: xoá tài khoản ngay bên dưới. Tài khoản bị vô hiệu hoá, thông tin cá nhân được ẩn danh, mặt bằng, concept, ảnh diễn hoạ và thông tin liên hệ bị xoá.',
            'Hoặc liên hệ 0375075975 / maconcept.asia@gmail.com, 44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP.HCM. Chúng tôi phản hồi trong thời hạn pháp luật quy định: [CẦN BỔ SUNG: số ngày làm việc cam kết].'
          ]} />
          <MyDataTools />
        </Section>

        <Section title="7. Lưu trữ cục bộ trên trình duyệt">
          <p>
            Website lưu trên trình duyệt của bạn (localStorage) mã đăng nhập, thông tin hiển thị tài khoản và lịch sử trò chuyện với trợ lý AI để duy trì phiên và tiện cho bạn. Chúng tôi không dùng cookie quảng cáo. Bạn có thể xoá các dữ liệu này bất cứ lúc nào bằng cách đăng xuất hoặc xoá dữ liệu trang trong cài đặt trình duyệt.
          </p>
        </Section>

        <Section title="8. Bảo mật">
          <p>
            Mật khẩu được băm một chiều; phiên đăng nhập có thời hạn và bị thu hồi khi đổi mật khẩu; hệ thống tạm khoá khi nhập sai mật khẩu nhiều lần. Không hệ thống nào an toàn tuyệt đối; nếu phát hiện sự cố ảnh hưởng đến bạn, chúng tôi sẽ thông báo theo quy định pháp luật.
          </p>
        </Section>

        <Section title="9. Trẻ em và thay đổi chính sách">
          <p>
            Dịch vụ dành cho người từ 18 tuổi trở lên. Khi chính sách thay đổi, chúng tôi cập nhật ngày và phiên bản ở đầu trang; thay đổi quan trọng sẽ được thông báo qua website hoặc email.
          </p>
        </Section>

        <p className="text-sm text-neutral-500 pt-4 border-t border-white/10">
          Xem thêm <Link to="/terms" className="text-amber-400 underline">Điều khoản sử dụng</Link>.
        </p>
      </main>
    </div>
  );
}
