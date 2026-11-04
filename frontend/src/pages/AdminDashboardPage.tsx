import React from 'react';
import { Shield, Film, Calendar, Users, Tv } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { Navigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { hasRole, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasRole('ADMIN')) {
    return <Navigate to="/" replace />;
  }

  const modules = [
    {
      title: 'Quản lý Phim & Poster',
      description: 'Thêm, sửa, ẩn phim và tải ảnh poster độ phân giải cao lên Cloudinary.',
      icon: Film,
      count: '37 phim',
      color: 'text-rose-500',
    },
    {
      title: 'Quản lý Suất Chiếu',
      description: 'Thiết lập lịch chiếu, kiểm tra chống trùng thời gian dọn phòng (BR-02).',
      icon: Calendar,
      count: 'Lên lịch',
      color: 'text-sky-500',
    },
    {
      title: 'Phòng Chiếu & Sơ Đồ Ghế',
      description: 'Cấu hình phòng chiếu (Standard, VIP, Sweetbox, Gold Class) và bảo trì.',
      icon: Tv,
      count: '16 phòng',
      color: 'text-amber-500',
    },
    {
      title: 'Tài Khoản & Soát Vé',
      description: 'Quản lý người dùng, phân quyền Staff và kiểm tra mã check-in vé.',
      icon: Users,
      count: 'Bảo mật',
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-rose-500 text-sm font-semibold mb-1">
            <Shield className="w-4 h-4" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Bảng điều khiển Quản trị</h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý danh mục rạp, phim, suất chiếu và kiểm soát hệ thống</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex items-start gap-5 shadow-lg"
            >
              <div className={`p-3.5 rounded-xl bg-slate-950 border border-slate-800 ${mod.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{mod.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {mod.count}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{mod.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
