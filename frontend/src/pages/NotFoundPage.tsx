import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 text-center space-y-5">
      <Film className="w-16 h-16 text-rose-500/50 mx-auto stroke-1" />
      <h1 className="text-4xl font-black text-white">404 - Không tìm thấy trang</h1>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi.
      </p>
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
};
