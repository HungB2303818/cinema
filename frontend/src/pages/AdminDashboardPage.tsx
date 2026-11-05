import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Shield, Film, Calendar, Users, Tv } from 'lucide-react';
import { useAuth } from '@/features/auth';

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
      count: 'Danh mục',
      color: 'text-[#e6e2c1]',
      link: '/admin/movies',
      linkText: 'Quản lý danh sách phim',
    },
    {
      title: 'Quản lý Suất Chiếu',
      description: 'Thiết lập lịch chiếu, kiểm tra chống trùng thời gian dọn phòng (BR-02).',
      icon: Calendar,
      count: 'Lên lịch',
      color: 'text-sky-400',
    },
    {
      title: 'Phòng Chiếu & Sơ Đồ Ghế',
      description: 'Cấu hình phòng chiếu (Standard, VIP, Sweetbox, Gold Class) và bảo trì.',
      icon: Tv,
      count: 'Cấu hình',
      color: 'text-[#e6e2c1]',
    },
    {
      title: 'Tài Khoản & Soát Vé',
      description: 'Quản lý người dùng, phân quyền Staff và kiểm tra mã check-in vé.',
      icon: Users,
      count: 'Bảo mật',
      color: 'text-emerald-400',
      link: '/staff/check-in',
      linkText: 'Vào trang soát vé',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-[#20232e] pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
            <Shield className="w-4 h-4" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Bảng điều khiển Quản trị</h1>
          <p className="text-zinc-400 text-sm mt-1">Quản lý danh mục rạp, phim, suất chiếu và kiểm soát hệ thống</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <div
              key={i}
              className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 hover:border-[#e6e2c1]/50 transition-all flex items-start gap-5 shadow-xl shadow-black/30"
            >
              <div className={`p-3.5 rounded-xl bg-[#090a0f] border border-[#242733] ${mod.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{mod.title}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#181a24] border border-[#282b3a] text-zinc-300 font-semibold">
                    {mod.count}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{mod.description}</p>
                {mod.link && (
                  <div className="pt-2">
                    <Link
                      to={mod.link}
                      className="inline-flex items-center gap-1.5 text-xs text-[#e6e2c1] hover:underline font-semibold"
                    >
                      <span>{mod.linkText || 'Truy cập'} &rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
