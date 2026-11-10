# MAC Concept

Website agency thiết kế - thi công không gian, gồm trang giới thiệu, khu khách hàng có **AI Studio** (diễn hoạ không gian từ mặt bằng và concept của khách) và khu quản trị cho đội MAC (leads, dự toán BOQ, vật tư, người dùng).

- Giao diện: React 19, Vite, Tailwind 4, GSAP, React Router
- Máy chủ: Express 5, MongoDB (Mongoose), JWT
- AI: Google Gemini (gói miễn phí) và Pollinations cho ảnh phối cảnh (miễn phí). Không có khoá vẫn chạy bằng bộ quy tắc thiết kế dự phòng.

## Chạy thử trên máy

```bash
# Giao diện
cp .env.example .env          # VITE_API_URL trỏ tới backend
npm install
npm run dev

# Máy chủ
cd backend
cp .env.example .env          # điền MONGO_URI, JWT_SECRET, (tuỳ chọn) GEMINI_API_KEY
npm install
ADMIN_PASSWORD='mat-khau-manh-cua-ban' node scripts/seedAdmin.js   # tạo tài khoản admin
npm run dev
npm test                      # kiểm thử logic dự toán, hạn mức, AI, telesale
```

Lấy khoá Gemini miễn phí tại https://aistudio.google.com/apikey rồi đặt vào `GEMINI_API_KEY`.

## Luồng của khách

1. Đăng ký / đăng nhập (hệ thống lưu số lần và thời gian đăng nhập)
2. **Mặt bằng**: ngang x dài, ảnh hiện trạng, địa chỉ, đất trống hoặc đã có nhà
3. **Concept**: style, màu chủ đạo, chất liệu, mô tả ý tưởng, ngân sách
4. **Liên hệ**: để lại số điện thoại (bắt buộc, chuyển cho telesale)
5. **Diễn hoạ**: AI phân tích mặt bằng, dựng ảnh phối cảnh và đưa khoảng giá sơ bộ

Mọi bước đều được lưu để tính **điểm quan tâm** (0-100) giúp telesale ưu tiên khách.

## Phân quyền

| Vai trò | AI chat | Diễn hoạ ảnh (mặc định) | Quản trị |
|---|---|---|---|
| Khách thường | AI thường, 30 tin/ngày | 1 lượt / 3 ngày | không |
| Khách Pro (cấp tay, có hạn) | AI thường, 300 tin/ngày | 3 lượt / ngày | không |
| Nhân viên (`staff`) | AI nội bộ có đọc vật tư và giá | 100 lượt / ngày | leads, BOQ, vật tư, thống kê |
| Quản trị (`admin`) | AI nội bộ | không giới hạn | tất cả + quản lý người dùng, cài đặt |

Hạn mức chỉnh bằng biến môi trường (xem `backend/.env.example`). Quyền được đọc lại từ database ở mỗi yêu cầu nên khoá tài khoản hay đổi quyền có hiệu lực ngay.

## Dự toán sơ bộ

`khối lượng = định mức vật tư / m² x diện tích x hệ số hiện trạng`, `đơn giá = trung vị các báo giá còn mới`. Kết quả là **khoảng giá thấp - cao** kèm độ tin cậy, không phải một con số cứng.

Để dự toán hoạt động, đội MAC cần nhập trong trang quản trị:

1. **Kho Vật Tư**: thêm vật tư và điền **định mức / m²** (vật tư có định mức 0 bị bỏ qua)
2. **Giá Thị Trường**: thêm báo giá cho từng vật tư (mới trong 120 ngày được tính là "còn mới")

Khi khách diễn hoạ xong, hệ thống tạo **BOQ nháp**. Nhân viên mở tab **Dự Toán BOQ**, chỉnh khối lượng và đơn giá, rồi duyệt. Khách chỉ thấy khoảng giá làm tròn, không thấy hạng mục hay đơn giá nội bộ. Nếu chưa có dữ liệu, hệ thống không bịa số mà báo đội MAC sẽ gửi dự toán sau.

Hệ số cải tạo khi đã có nhà trên đất nằm ở `SITE_FACTORS` trong `backend/src/services/estimateService.js`, hãy chỉnh theo thực tế thi công.

## Hỗ trợ telesale

- **Tóm tắt AI** cho từng lead: khách là ai, muốn gì, ý nên khai thác, câu mở đầu cuộc gọi
- **Báo lead nóng** qua Telegram hoặc webhook khi điểm quan tâm đạt `HOT_LEAD_SCORE` (mỗi lead báo một lần)
- **Phễu chuyển đổi** và thống kê style được quan tâm nhiều nhất ở tab Thống kê

## Dọn dữ liệu thử nghiệm

```bash
cd backend
node scripts/cleanupTestData.js --db mac_agency --users test1,demo            # chỉ liệt kê
node scripts/cleanupTestData.js --db mac_agency --users test1,demo --apply    # xoá thật
```

`--db` phải đúng tên database đang kết nối, nếu sai script dừng ngay (tránh xoá nhầm dữ liệu dự án khác). Script không đụng tới tài khoản admin/staff và không xoá các dự án trong mục Portfolio.

## Bảo mật cần nhớ

- Không commit `backend/.env`. Nếu mật khẩu admin cũ (`Mac@2026!Strong`) từng được dùng trên production, **hãy đổi ngay** vì nó từng nằm trong lịch sử Git công khai.
- Ảnh mặt bằng được nén ở trình duyệt và lưu trong database (tối đa 5 ảnh). Khi lượng khách tăng, nên chuyển sang kho ảnh riêng (Cloudinary, S3).
