# Cinema Booking Frontend (React + TypeScript + Vite)

Giao diện người dùng cho Hệ thống Đặt vé xem phim trực tuyến (Cinema Booking System), xây dựng trên nền tảng **React 19**, **TypeScript**, **Vite**, **TanStack Query**, **Axios** và **Tailwind CSS**, tuân thủ thiết kế **Feature-Based Architecture** (theo tài liệu [`cinema-booking-ai-kit/docs/react-frontend-architecture.md`](../cinema-booking-ai-kit/docs/react-frontend-architecture.md)).

---

## 1. Cấu trúc thư mục (Feature-Based Architecture)

```
frontend/src/
├── app/                        # Ứng dụng & Cấu hình toàn cục
│   ├── providers/              # QueryProvider (TanStack Query), AuthProvider, index
│   ├── router/                 # AppRouter, ProtectedRoute, AdminRoute
│   ├── App.tsx                 # Root Application
│   └── main.tsx                # Entry point
│
├── pages/                      # Page components ghép nối layout và feature
│   ├── HomePage.tsx            # Trang chủ: Phim đang chiếu, sắp chiếu, cụm rạp nổi bật
│   ├── MovieDetailsPage.tsx    # Chi tiết phim & danh sách suất chiếu
│   ├── CinemasPage.tsx         # Khám phá hệ thống rạp CGV Cần Thơ & toàn quốc
│   ├── ShowtimesPage.tsx       # Tra cứu lịch chiếu phim theo ngày và theo rạp
│   ├── MyTicketsPage.tsx       # Danh sách vé đã đặt của khách hàng
│   ├── LoginPage.tsx           # Đăng nhập tài khoản
│   ├── RegisterPage.tsx        # Đăng ký thành viên
│   ├── AdminDashboardPage.tsx  # Bảng điều khiển quản trị
│   ├── AdminRevenuePage.tsx    # Doanh thu & thống kê: bộ lọc, biểu đồ, bảng nhóm, CSV
│   ├── NotFoundPage.tsx        # Trang 404
│   └── index.ts
│
├── features/                   # Các miền nghiệp vụ độc lập (Feature Modules)
│   ├── auth/                   # Xác thực: api, context, hooks, types
│   ├── movies/                 # Quản lý phim: api, components (MovieCard), hooks (useMovies, useMovieDetail), types
│   ├── cinemas/                # Cụm rạp CGV: api, components (CinemaCard, CinemaDetailModal), hooks (useCinemas), data fallback, types
│   ├── showtimes/              # Lịch & suất chiếu: api, hooks (useShowtimes), types
│   ├── bookings/               # Đặt vé & giữ ghế: api, types
│   ├── tickets/                # Vé điện tử: api, hooks (useMyTickets), types
│   └── reports/                # Doanh thu admin: api, hooks, components, utils, types
│
├── shared/                     # Tài nguyên & Primitives dùng chung
│   ├── api/                    # HTTP Client chung (Axios instance, JWT interceptor, ApiError)
│   │   └── http-client.ts
│   ├── components/
│   │   ├── ui/                 # Button, Input, Modal, LoadingSpinner, Badge
│   │   └── layout/             # Header (Navbar), Footer, MainLayout
│   ├── types/                  # Types dùng chung (PageResponse, ApiError)
│   └── utils/                  # formatCurrency (VND), formatDateTime, getAgeRatingBadge
│
└── index.css                   # Tailwind CSS v4 styling
```

---

## 2. Cài đặt và Khởi chạy

### Cài đặt dependencies:
```bash
npm install
```

### Chạy môi trường phát triển (Dev server):
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

### Biên dịch production:
```bash
npm run build
```

---

## 3. Cấu hình Môi trường & Proxy

File [`.env`](.env) mặc định sử dụng đường dẫn tương đối `/api`:
```properties
VITE_API_BASE_URL=/api
VITE_APP_NAME="Cinema Booking"
```
Khi chạy `npm run dev`, Vite sẽ tự động proxy mọi request bắt đầu bằng `/api` sang backend Spring Boot tại `http://localhost:8080` (tránh lỗi CORS khi dev).

---

## 4. Trang Doanh thu & thống kê (ADMIN)

Route `/admin/reports/revenue`, chỉ ADMIN (bọc `AdminRoute`); mục sidebar "Doanh thu & thống kê".

- Bộ lọc ngày Việt Nam + rạp/phim lấy từ endpoint ADMIN (`getAdminMovies`, `listCinemas`) nên vẫn chọn được phim HIDDEN/ENDED và rạp INACTIVE. Trạng thái lọc đồng bộ URL (`from`, `to`, `cinemaId`, `movieId`, `timeGroup`, `tab`, `page`, `size`); đổi bộ lọc đưa `page` về 0; nút "Áp dụng" mới commit bộ lọc nháp.
- Chọn nhanh: hôm nay, 7 ngày, tháng này, tháng trước. Khoảng tối đa 366 ngày, validate `from <= to` trước khi gọi API.
- Tab "Theo thời gian" hiển thị 4 thẻ tổng hợp, biểu đồ SVG và bảng ngày/tháng; tab "Theo phim"/"Theo rạp" gọi breakdown phân trang/sort. Tiền là chuỗi thập phân từ API, format bằng `formatMoneyString` để không mất chữ số.
- "Xuất CSV" tải blob theo đúng bộ lọc đã áp dụng (không phải trang đang xem), xử lý lỗi JSON trong blob và chặn response của phiên đăng nhập cũ. Quá 10.000 dòng hiển thị lỗi `REPORT_EXPORT_TOO_LARGE`.
- Loading/rỗng/lỗi tách biệt, có nút "Thử lại"; trang ghi rõ số liệu là thanh toán mô phỏng.

Kiểm thử:

```bash
npm test -- reports.api admin-revenue report-filters report-format
npm run build
npm run lint
```
