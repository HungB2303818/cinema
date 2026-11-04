import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#090a0f] border-t border-[#20232d] text-zinc-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 text-white font-bold text-xl tracking-tight">
              <Film className="w-7 h-7 text-[#e6e2c1]" />
              <span>CINEMA<span className="text-[#e6e2c1]">PLUS</span></span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Hệ thống đặt vé xem phim trực tuyến hiện đại. Cập nhật lịch chiếu liên tục, thanh toán tiện lợi và trải nghiệm điện ảnh tiêu chuẩn Hollywood.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-[#e6e2c1]" />
              <span>Bảo mật thông tin giao dịch</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Khám phá</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/movies?status=SHOWING" className="hover:text-[#e6e2c1] transition-colors">
                  Phim đang chiếu
                </Link>
              </li>
              <li>
                <Link to="/movies?status=UPCOMING" className="hover:text-[#e6e2c1] transition-colors">
                  Phim sắp khởi chiếu
                </Link>
              </li>
              <li>
                <Link to="/cinemas" className="hover:text-[#e6e2c1] transition-colors">
                  Hệ thống cụm rạp CGV
                </Link>
              </li>
              <li>
                <Link to="/showtimes" className="hover:text-[#e6e2c1] transition-colors">
                  Lịch chiếu phim hôm nay
                </Link>
              </li>
            </ul>
          </div>

          {/* Special rooms */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Trải nghiệm rạp</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-zinc-300">Phòng chiếu Gold Class sang trọng</span>
              </li>
              <li>
                <span className="text-zinc-300">Công nghệ màn chiếu 3D kỹ thuật số</span>
              </li>
              <li>
                <span className="text-zinc-300">Hệ thống âm thanh Dolby Surround 7.1</span>
              </li>
              <li>
                <span className="text-zinc-300">Ghế đôi Sweetbox lãng mạn</span>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Chăm sóc khách hàng</h4>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#e6e2c1]" />
                <span>Hotline: <strong className="text-white">1900 6017</strong> (8:00 - 22:00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#e6e2c1]" />
                <span>Email: support@cinemaplus.vn</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#e6e2c1]" />
                <span>Mở cửa tất cả các ngày trong tuần</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#20232e] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 CinemaPlus Booking System. Kiến trúc Spring Boot 3 + React Vite.</p>
          <div className="flex items-center gap-6">
            <span>Chính sách bảo mật</span>
            <span>Điều khoản sử dụng</span>
            <span>Quy chế hoạt động</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
