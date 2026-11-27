import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Film,
  Armchair,
  Calendar,
  Sparkles,
  BarChart3,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

export interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    to: '/admin/movies',
    label: 'Quản lý phim',
    icon: Film,
    isActive: (pathname) => pathname.startsWith('/admin/movies'),
  },
  {
    to: '/admin/rooms',
    label: 'Phòng chiếu & ghế',
    icon: Armchair,
    isActive: (pathname) => pathname.startsWith('/admin/rooms'),
  },
  {
    to: '/admin/showtimes',
    label: 'Suất chiếu',
    icon: Calendar,
    isActive: (pathname) =>
      pathname.startsWith('/admin/showtimes') &&
      !pathname.startsWith('/admin/showtimes/auto-generate'),
  },
  {
    to: '/admin/showtimes/auto-generate',
    label: 'Tạo suất tự động',
    icon: Sparkles,
    isActive: (pathname) => pathname.startsWith('/admin/showtimes/auto-generate'),
  },
  {
    to: '/admin/reports/revenue',
    label: 'Doanh thu & thống kê',
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith('/admin/reports'),
  },
];

const linkClass = (active: boolean) =>
   `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1] motion-reduce:transition-none ${
    active
      ? "bg-[#1a1c24] text-[#e6e2c1] font-semibold"
      : "text-zinc-300 hover:bg-[#1a1c24] hover:text-white"
  }`;

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    logout();
    if (onMobileClose) onMobileClose();
    navigate('/');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#20232e]">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-white font-bold tracking-tight group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1] rounded-lg"
          onClick={onMobileClose}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6e2c1] text-black">
            <Film className="w-5 h-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-black">CINEMA<span className="text-[#e6e2c1]">PLUS</span></span>
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Cinema Booking</span>
          </span>
        </Link>
        {mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Đóng menu quản trị"
            className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1c24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Menu quản trị" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              aria-current={active ? 'page' : undefined}
              className={linkClass(active)}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors motion-reduce:transition-none ${active ? 'text-[#e6e2c1]' : 'text-zinc-400 group-hover:text-white'}`} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#e6e2c1]" />}
            </Link>
          );
        })}
      </nav>

      {/* Account / logout */}
      <div className="border-t border-[#20232e] px-3 py-4 space-y-2">
        {user && (
          <Link to="/profile" onClick={onMobileClose} aria-label="Thông tin cá nhân" className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-[#0d0e14] border border-[#20232e] hover:bg-[#1a1c24] focus-visible:outline-2 focus-visible:outline-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6e2c1] text-black text-xs font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-100 truncate">{user.fullName}</p>
              <p className="text-[10px] text-[#e6e2c1] font-mono font-bold truncate">{user.role}</p>
            </div>
          </Link>
        )}

        <Link
          to="/"
          onClick={onMobileClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-[#1a1c24] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1] motion-reduce:transition-none"
        >
          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500 rotate-180" />
          <span className="truncate">Xem trang khách</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer border-none motion-reduce:transition-none"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="truncate">Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64 bg-[#0d0e14] border-r border-[#20232e]">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#0d0e14] border-r border-[#20232e] transform transition-transform duration-200 motion-reduce:transition-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 cursor-default"
          onClick={onMobileClose}
        />
      )}
    </>
  );
};
