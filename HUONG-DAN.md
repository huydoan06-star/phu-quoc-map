# Hướng dẫn cho Đại nhân — thêm ảnh lên Phú Quốc Map

Trang web: https://huydoan06-star.github.io/phu-quoc-map/
Thư mục trên máy: `D:\pq-map`

## Cài một lần
1. Máy đã có Node.js và Git (đang dùng được).
2. Mở PowerShell tại `D:\pq-map`, chạy: `npm install` (cài công cụ xử lý ảnh, chỉ cần làm một lần).

## Mỗi lần thêm ảnh
1. **Khi chụp:** bật *định vị / vị trí* cho app camera trên điện thoại để ảnh có toạ độ GPS. Khi chép ảnh sang máy tính, chép **file gốc** (đừng gửi qua Zalo/Messenger — các app này xoá GPS).
2. Chép ảnh vào thư mục **`D:\pq-map\anh-moi\`** (JPG, PNG, WEBP, HEIC đều được).
3. Nhấp đúp **`them-anh.bat`**. Script sẽ:
   - đọc toạ độ GPS và giờ chụp trong ảnh,
   - thu nhỏ ảnh (tối đa 1600px) và đổi sang WebP trong `photos/`, **xoá hết thông tin EXIF/GPS/tên máy khỏi ảnh đăng** (bảo vệ riêng tư — toạ độ chỉ nằm trong `spots.json`),
   - thêm một mục **nháp** (`"status": "draft"`) vào `data/spots.json`,
   - chuyển ảnh gốc vào `anh-moi\da-xu-ly\` (không xoá ảnh gốc),
   - in ra danh sách ảnh nào **thiếu GPS**.
4. Mở `data/spots.json` (bằng Notepad hoặc VS Code), tìm id vừa tạo (dạng `2026-10-17-ab12`), điền:
   - `name`, `guide` (giới thiệu), `tips` (mẹo/lưu ý), `bestTime` (giờ/mùa đẹp) — **ít nhất tiếng Anh `"en"`**; thêm `"vi"`, `"ko"`, `"hi"`… nếu muốn (thiếu thì web tự dùng tiếng Anh),
   - `alt` của ảnh (mô tả ngắn tiếng Anh, cho người khiếm thị và Google),
   - `category`: `beach`, `sunset`, `food`, `market`, `nature`, `viewpoint`, `culture`, `nightlife`, `safety`,
   - `youtube`: link video nếu có,
   - đổi `"status": "draft"` thành `"status": "published"`.
5. Xem thử trên máy: `npm run serve` rồi mở http://localhost:8080 (Ctrl+C để tắt).
6. Đăng lên web: nhấp đúp `them-anh.bat` lần nữa với tuỳ chọn đăng — trong PowerShell gõ `.\them-anh.bat --publish`, hoặc tự chạy:
   ```
   git add data photos
   git commit -m "Thêm ảnh mới"
   git push
   ```
   Khoảng 1–2 phút sau trang web cập nhật.

Chạy thử không ghi gì: `.\them-anh.bat --dry-run`.

## Ảnh thiếu GPS
Mục đó có `"lat": null, "lng": null, "needsLocation": true` và **không hiện trên bản đồ**. Cách sửa: mở Google Maps → nhấn giữ đúng vị trí → bấm vào dãy số toạ độ để chép (ví dụ `10.05247, 104.03519`) → số đầu điền vào `lat`, số sau vào `lng` → xoá dòng `"needsLocation": true`.

## Thay ảnh tạm (placeholder) của 6 điểm mẫu
6 điểm mẫu đang dùng ảnh minh hoạ ghi chữ PLACEHOLDER. Khi có ảnh thật: thêm ảnh như trên, rồi chép phần `photos` và `capturedAt` của mục mới sang điểm mẫu tương ứng (hoặc xoá điểm mẫu và giữ mục mới).

## Link affiliate (sau này)
Chưa có link nào. Khi cần, mỗi điểm có ô `"links": []`, ví dụ:
`"links": [{ "type": "tour", "label": { "en": "Book a tour" }, "url": "https://..." }]` — web tự hiện nút trong thẻ địa điểm (gắn `rel="sponsored"`). Ở cấp trang có sẵn mục ẩn "Plan your trip" trong `index.html`. Nhớ thêm dòng thông báo affiliate khi bật.

## Bản dịch
Tiếng Hàn, Trung (giản thể & phồn thể), Nhật, Hindi, Nga là **dịch máy** — web có ghi chú nhỏ ở cuối trang. Nên nhờ người bản xứ xem lại các file trong `i18n/` và các trường tương ứng trong `data/spots.json`. Thêm ngôn ngữ mới: xem `docs/I18N.md` (chỉ cần thêm 1 file JSON).

## Mẹo du lịch & nguồn
Nội dung "Before you go" nằm trong `i18n/<ngôn ngữ>.json` (mục `tips`), nguồn trích dẫn trong `data/tips.json` và `SOURCES.md`. Quy định thay đổi thì sửa ở đó và cập nhật ngày "Last checked".
