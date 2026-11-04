import React, { useState, useMemo } from 'react';
import { Search, MapPin, Tv, Sparkles, Filter, Building2, RefreshCw } from 'lucide-react';
import type { Cinema } from '@/features/cinemas';
import { useCinemas, CinemaCard, CinemaDetailModal } from '@/features/cinemas';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

export const CinemasPage: React.FC = () => {
  const { data: cinemas = [], isLoading: loading, error, refetch } = useCinemas();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');

  // Modal State
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);

  // City list
  const cities = useMemo(() => {
    const list = Array.from(new Set(cinemas.map((c) => c.city || 'Cần Thơ')));
    return ['ALL', ...list];
  }, [cinemas]);

  // Filtered cinemas
  const filteredCinemas = useMemo(() => {
    return cinemas.filter((c) => {
      // City filter
      if (selectedCity !== 'ALL' && c.city !== selectedCity) {
        return false;
      }
      // Format filter
      if (selectedFormat !== 'ALL' && !c.roomTypes?.includes(selectedFormat)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(query);
        const matchAddress = c.address.toLowerCase().includes(query);
        return matchName || matchAddress;
      }
      return true;
    });
  }, [cinemas, selectedCity, selectedFormat, searchQuery]);

  // Statistics
  const totalRooms = useMemo(() => {
    return cinemas.reduce((sum, c) => sum + (c.roomsCount || 4), 0);
  }, [cinemas]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Hệ Thống Cụm Rạp Hiện Đại
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Khám Phá Các Cụm Rạp <span className="text-rose-500">CGV Cần Thơ</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Trải nghiệm không gian điện ảnh đỉnh cao với âm thanh vòm Dolby Surround 7.1, màn chiếu sắc nét tiêu chuẩn Hollywood và phòng chiếu đặc biệt Gold Class sang trọng.
            </p>

            {/* Quick stats banner */}
            <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-10 text-slate-300 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <Building2 className="w-7 h-7 text-rose-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{cinemas.length}</div>
                  <div className="text-xs text-slate-400">Cụm rạp đang chiếu</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tv className="w-7 h-7 text-indigo-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{totalRooms}+</div>
                  <div className="text-xs text-slate-400">Phòng chiếu tiêu chuẩn</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-amber-400" />
                <div>
                  <div className="text-2xl font-bold text-white">Gold Class</div>
                  <div className="text-xs text-slate-400">Trải nghiệm thượng lưu</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <section className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm rạp theo tên hoặc địa chỉ (ví dụ: Sense City, Xuân Khánh, Cần Thơ...)"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      selectedCity === city
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {city === 'ALL' ? 'Tất cả khu vực' : city}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                {['ALL', '2D', '3D', 'Gold Class', 'Sweetbox'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {fmt === 'ALL' ? 'Tất cả phòng' : fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Cinema List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner message="Đang tải danh sách rạp phim..." />
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-rose-400 text-sm">{error instanceof Error ? error.message : 'Lỗi tải rạp phim'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </button>
          </div>
        ) : filteredCinemas.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Không tìm thấy rạp chiếu nào phù hợp</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Vui lòng thử từ khóa tìm kiếm khác hoặc đổi bộ lọc khu vực / định dạng phòng.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('ALL');
                setSelectedFormat('ALL');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-400 px-1">
              <span>
                Hiển thị <strong className="text-white">{filteredCinemas.length}</strong> cụm rạp
              </span>
              <span className="text-xs text-slate-500">Dữ liệu rạp đồng bộ từ CGV Việt Nam</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCinemas.map((cinema) => (
                <CinemaCard
                  key={cinema.id}
                  cinema={cinema}
                  onSelectCinema={(c) => setSelectedCinema(c)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <CinemaDetailModal
        cinema={selectedCinema}
        onClose={() => setSelectedCinema(null)}
      />
    </div>
  );
};
