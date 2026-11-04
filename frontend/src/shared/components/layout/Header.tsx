import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Film, User as UserIcon, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-rose-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-rose-500 font-bold text-xl tracking-tight">
            <Film className="w-7 h-7" />
            <span>CINEMA<span className="text-white">PLUS</span></span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={navLinkClass} end>
              Trang chủ
            </NavLink>
            <NavLink to="/movies?status=SHOWING" className={navLinkClass}>
              Phim đang chiếu
            </NavLink>
            <NavLink to="/movies?status=UPCOMING" className={navLinkClass}>
              Phim sắp chiếu
            </NavLink>
            <NavLink to="/cinemas" className={navLinkClass}>
              Rạp phim
            </NavLink>
            <NavLink to="/showtimes" className={navLinkClass}>
              Lịch chiếu
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/my-tickets" className={navLinkClass}>
                Vé của tôi
              </NavLink>
            )}
            {hasRole('ADMIN') && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Shield className="w-4 h-4" />
                  Quản trị
                </span>
              </NavLink>
            )}
          </nav>

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-200">{user.fullName}</span>
                  <span className="text-xs text-rose-400 font-semibold">{user.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-slate-200 hover:text-white transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
