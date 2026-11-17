import React, { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AdminSidebar } from './admin/AdminSidebar';

export const AdminLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 selection:bg-[#e6e2c1] selection:text-black">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-[#e6e2c1] text-black font-bold rounded-full border-none shadow-xl outline-none"
      >
        Chuyển đến nội dung chính
      </a>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#090a0f]/95 backdrop-blur-md border-b border-[#20232d] flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
          aria-expanded={mobileOpen}
          className="p-2 rounded-md text-zinc-300 hover:text-white hover:bg-[#1a1c24] transition-colors cursor-pointer border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1]"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 text-white font-bold tracking-tight"
        >
          <span className="text-sm">CINEMA<span className="text-[#e6e2c1]">PLUS</span></span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Admin</span>
        </Link>
      </div>

      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-w-0 pt-20 pb-8 lg:pt-8 lg:ml-64 px-4 sm:px-6 lg:px-8 focus:outline-none overflow-x-hidden"
      >
        <Outlet />
      </main>
    </div>
  );
};
