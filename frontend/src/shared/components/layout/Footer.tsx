import React from 'react';
import { Film } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
            <Film className="w-6 h-6" />
            <span>CINEMA<span className="text-white">PLUS</span></span>
            <span className="text-xs text-slate-500 ml-2">Hệ thống đặt vé xem phim trực tuyến</span>
          </div>

          <div className="text-xs text-slate-500 text-center md:text-right">
            <p>© 2026 Cinema Booking System. Kiến trúc Spring Boot 3 + React Vite.</p>
            <p className="mt-1">Dữ liệu phim & rạp cập nhật theo thời gian thực.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
