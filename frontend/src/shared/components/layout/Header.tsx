import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film, User as UserIcon, LogOut, Shield, Menu, X, ArrowLeft, Headphones } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';

export interface HeaderProps {
  variant?: 'customer' | 'admin' | 'auth';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'customer' }) => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/');
  };

  // Active state calculations
  const pathname = location.pathname;
  const search = location.search;

  const isHomeActive = pathname === '/' && search === '';
  const isShowingActive = pathname === '/movies' && (search === '' || search.includes('status=SHOWING'));
  const isUpcomingActive = pathname === '/movies' && search.includes('status=UPCOMING');
  const isCinemasActive = pathname.startsWith('/cinemas');
  const isShowtimesActive = pathname.startsWith('/showtimes');
  const isTicketsActive = pathname.startsWith('/my-tickets');
  const isAdminActive = pathname.startsWith('/admin');

  const getNavLinkClass = (isActive: boolean) =>
    `px-3 py-1.5 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-semibold transition-all duration-200 border-none shrink-0 ${
      isActive
        ? 'bg-[#e6e2c1] text-black shadow-sm font-bold'
        : 'text-zinc-300 hover:bg-[#1a1c24] hover:text-white'
    }`;

  const getMobileNavLinkClass = (isActive: boolean) =>
    `flex items-center gap-2.5 px-4 py-3 rounded-full text-base font-semibold transition-all border-none ${
      isActive
        ? 'bg-[#e6e2c1] text-black shadow-sm font-bold'
        : 'text-zinc-300 hover:bg-[#1a1c24] hover:text-white'
    }`;

  // ==================== AUTH LAYOUT HEADER ====================
  if (variant === 'auth') {
    return (
      <header className="sticky top-0 z-50 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#20232d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 text-white font-bold text-lg sm:text-xl tracking-tight group"
            >
              <Film className="w-6 h-6 sm:w-7 sm:h-7 text-[#e6e2c1] transition-transform duration-300 group-hover:scale-110" />
              <span>
                CINEMA<span className="text-[#e6e2c1]">PLUS</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
                <Headphones className="w-3.5 h-3.5 text-[#e6e2c1]" />
                <span>Hỗ trợ: <strong className="text-zinc-200">1900 6017</strong></span>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-[#161821] hover:bg-[#20232d] rounded-full border-none transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ==================== ADMIN LAYOUT HEADER ====================
  if (variant === 'admin') {
    return (
      <header className="sticky top-0 z-50 bg-[#090a0f]/95 backdrop-blur-md border-b border-[#20232d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand + Admin Badge */}
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="flex items-center gap-2 text-white font-bold text-lg sm:text-xl tracking-tight group"
              >
                <Film className="w-6 h-6 sm:w-7 sm:h-7 text-[#e6e2c1] transition-transform duration-300 group-hover:scale-110" />
                <span>
                  CINEMA<span className="text-[#e6e2c1]">PLUS</span>
                </span>
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e6e2c1] text-black border-none shadow-sm">
                <Shield className="w-3 h-3" />
                Admin Panel
              </span>
            </div>

            {/* Right: Switch to Store + Admin Info */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-[#161821] hover:bg-[#20232d] rounded-full border-none transition-colors"
                title="Quay lại trang khách"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Xem trang khách</span>
              </Link>

              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-[#20232e]">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-semibold text-zinc-200">{user.fullName}</span>
                    <span className="text-[10px] text-[#e6e2c1] font-mono font-bold">ADMINISTRATOR</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 sm:px-3 sm:py-1.5 text-xs bg-red-950/40 hover:bg-red-900/60 text-red-200 rounded-full border-none transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Đăng xuất quản trị"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thoát</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ==================== CUSTOMER / MAIN LAYOUT HEADER ====================
  return (
    <header className="sticky top-0 z-50 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#20232d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 text-white font-bold text-lg xl:text-xl tracking-tight shrink-0 group"
          >
            <Film className="w-6 h-6 xl:w-7 xl:h-7 text-[#e6e2c1] transition-transform duration-300 group-hover:scale-110" />
            <span>
              CINEMA<span className="text-[#e6e2c1]">PLUS</span>
            </span>
          </Link>

          {/* Desktop Navigation Links (>= lg: 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Menu chính">
            <Link to="/" className={getNavLinkClass(isHomeActive)}>
              Trang chủ
            </Link>
            <Link to="/movies?status=SHOWING" className={getNavLinkClass(isShowingActive)}>
              Phim đang chiếu
            </Link>
            <Link to="/movies?status=UPCOMING" className={getNavLinkClass(isUpcomingActive)}>
              Phim sắp chiếu
            </Link>
            <Link to="/cinemas" className={getNavLinkClass(isCinemasActive)}>
              Rạp phim
            </Link>
            <Link to="/showtimes" className={getNavLinkClass(isShowtimesActive)}>
              Lịch chiếu
            </Link>
            {isAuthenticated && (
              <Link to="/my-tickets" className={getNavLinkClass(isTicketsActive)}>
                Vé của tôi
              </Link>
            )}
            {hasRole('ADMIN') && (
              <Link to="/admin" className={getNavLinkClass(isAdminActive)}>
                <span className="flex items-center gap-1.5">
                  <Shield className={`w-3.5 h-3.5 ${isAdminActive ? 'text-black' : 'text-[#e6e2c1]'}`} />
                  <span>Quản trị</span>
                </span>
              </Link>
            )}
          </nav>

          {/* Auth section - Desktop (>= lg: 1024px) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col items-end">
                  <span className="text-xs xl:text-sm font-medium text-zinc-200">{user.fullName}</span>
                  <StatusBadge status={user.role} size="sm" className="mt-0.5" />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm bg-[#161821] hover:bg-[#20232d] text-zinc-300 rounded-full border-none transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1 px-3.5 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm text-zinc-300 hover:text-white transition-colors rounded-full"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 xl:px-5 xl:py-2 text-xs xl:text-sm font-bold bg-[#e6e2c1] hover:bg-[#dad6b2] active:scale-[0.98] text-black rounded-full shadow-md transition-all duration-200 border-none"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile / Tablet controls (< lg: 1024px) */}
          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated && user && (
              <div className="w-8 h-8 rounded-full bg-[#e6e2c1] text-black font-bold flex items-center justify-center text-xs shadow-sm">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-[#181a24] transition-colors cursor-pointer border-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#20232d] bg-[#0d0e14]/98 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-3">
            {/* User status in mobile */}
            {isAuthenticated && user && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#14161f] border border-[#242733] mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e6e2c1] text-black flex items-center justify-center font-bold text-sm">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{user.fullName}</div>
                    <div className="text-xs text-zinc-400">{user.email}</div>
                  </div>
                </div>
                <StatusBadge status={user.role} size="sm" />
              </div>
            )}

            {/* Mobile Nav Links */}
            <nav className="flex flex-col space-y-1" aria-label="Menu di động" onClick={closeMobileMenu}>
              <Link to="/" className={getMobileNavLinkClass(isHomeActive)}>
                Trang chủ
              </Link>
              <Link to="/movies?status=SHOWING" className={getMobileNavLinkClass(isShowingActive)}>
                Phim đang chiếu
              </Link>
              <Link to="/movies?status=UPCOMING" className={getMobileNavLinkClass(isUpcomingActive)}>
                Phim sắp chiếu
              </Link>
              <Link to="/cinemas" className={getMobileNavLinkClass(isCinemasActive)}>
                Rạp phim
              </Link>
              <Link to="/showtimes" className={getMobileNavLinkClass(isShowtimesActive)}>
                Lịch chiếu
              </Link>
              {isAuthenticated && (
                <Link to="/my-tickets" className={getMobileNavLinkClass(isTicketsActive)}>
                  Vé của tôi
                </Link>
              )}
              {hasRole('ADMIN') && (
                <Link to="/admin" className={getMobileNavLinkClass(isAdminActive)}>
                  <Shield className={`w-5 h-5 ${isAdminActive ? 'text-black' : 'text-[#e6e2c1]'}`} />
                  <span>Quản trị hệ thống</span>
                </Link>
              )}
            </nav>

            {/* Mobile Auth Actions */}
            <div className="pt-3 border-t border-[#20232e]">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#181a24] hover:bg-[#222530] text-zinc-300 font-semibold transition-colors cursor-pointer border-none"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3" onClick={closeMobileMenu}>
                  <Link
                    to="/login"
                    className="flex items-center justify-center py-2.5 px-4 rounded-full bg-[#181a24] text-zinc-200 font-semibold text-center text-sm border-none"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center py-2.5 px-4 rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black font-bold text-center text-sm shadow-md border-none"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
