import React, { useState, useMemo } from 'react';
import { Search, MapPin, Tv, Sparkles, Filter, Building2 } from 'lucide-react';
import type { Cinema } from '@/features/cinemas';
import { useCinemas, CinemaCard, CinemaDetailModal } from '@/features/cinemas';
import { LoadingSpinner, ErrorState, EmptyState, Button } from '@/shared/components/ui';

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
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10121a] via-[#161824] to-[#0d0e14] border border-[#242733] p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e6e2c1]/15 text-[#e6e2c1] text-xs font-bold tracking-wide uppercase border-none">
              <Sparkles className="w-3.5 h-3.5" /> Hệ Thống Cụm Rạp Hiện Đại
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Khám Phá Các Cụm Rạp <span className="text-[#e6e2c1]">CGV Cần Thơ</span>
            </h1>
            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
              Trải nghiệm không gian điện ảnh đỉnh cao với âm thanh vòm Dolby Surround 7.1, màn chiếu sắc nét tiêu chuẩn Hollywood và phòng chiếu đặc biệt Gold Class sang trọng.
            </p>

            {/* Quick stats banner */}
            <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-10 text-zinc-300 border-t border-[#20232e]">
              <div className="flex items-center gap-3">
                <Building2 className="w-7 h-7 text-[#e6e2c1]" />
                <div>
                  <div className="text-2xl font-bold text-white">{cinemas.length}</div>
                  <div className="text-xs text-zinc-400">Cụm rạp đang chiếu</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tv className="w-7 h-7 text-zinc-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{totalRooms}+</div>
                  <div className="text-xs text-zinc-400">Phòng chiếu tiêu chuẩn</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-[#e6e2c1]" />
                <div>
                  <div className="text-2xl font-bold text-white">Gold Class</div>
                  <div className="text-xs text-zinc-400">Trải nghiệm thượng lưu</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <section className="bg-[#13151d] backdrop-blur rounded-2xl border border-[#242733] p-5 space-y-4 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm rạp theo tên hoặc địa chỉ (ví dụ: Sense City, Xuân Khánh, Cần Thơ...)"
                className="w-full pl-11 pr-4 py-2.5 bg-[#090a0f] border border-[#242733] rounded-full text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer border-none"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#e6e2c1] shrink-0" />
              <div className="flex bg-[#090a0f] p-1 rounded-full border border-[#242733] text-xs font-semibold">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`px-4 py-2 rounded-full transition-colors cursor-pointer border-none ${
                      selectedCity === city
                        ? 'bg-[#e6e2c1] text-black shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-[#181a24]'
                    }`}
                  >
                    {city === 'ALL' ? 'Tất cả khu vực' : city}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex bg-[#090a0f] p-1 rounded-full border border-[#242733] text-xs font-semibold">
                {['ALL', '2D', '3D', 'Gold Class', 'Sweetbox'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-4 py-2 rounded-full transition-colors cursor-pointer border-none ${
                      selectedFormat === fmt
                        ? 'bg-[#e6e2c1] text-black shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-[#181a24]'
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
          <ErrorState
            title="Lỗi tải danh sách rạp phim"
            message={error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ dữ liệu rạp.'}
            onRetry={() => refetch()}
          />
        ) : filteredCinemas.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Không tìm thấy rạp chiếu nào phù hợp"
            description="Vui lòng thử từ khóa tìm kiếm khác hoặc đổi bộ lọc khu vực / định dạng phòng."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCity('ALL');
                  setSelectedFormat('ALL');
                }}
              >
                Đặt lại bộ lọc
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-zinc-400 px-1">
              <span>
                Hiển thị <strong className="text-white">{filteredCinemas.length}</strong> cụm rạp
              </span>
              <span className="text-xs text-zinc-500">Dữ liệu rạp đồng bộ từ CGV Việt Nam</span>
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
