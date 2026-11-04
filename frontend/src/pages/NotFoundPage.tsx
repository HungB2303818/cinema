import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 text-center space-y-5">
      <Film className="w-16 h-16 text-[#e6e2c1]/50 mx-auto stroke-1" />
      <h1 className="text-4xl font-black text-white">404 - Không tìm thấy trang</h1>
      <p className="text-zinc-400 text-sm max-w-md mx-auto">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi.
      </p>
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#e6e2c1] hover:bg-[#dad6b2] active:scale-[0.98] text-black text-sm font-bold rounded-full shadow-lg transition-all border-none"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
};
