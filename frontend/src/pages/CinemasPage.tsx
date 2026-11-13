import React, { useState, useMemo } from 'react';
import { Search, Building2, Sparkles } from 'lucide-react';
import type { Cinema } from '@/features/cinemas';
import { useCinemas, CinemaCard, CinemaDetailModal } from '@/features/cinemas';
import { LoadingSpinner, ErrorState, EmptyState, Button } from '@/shared/components/ui';

export const CinemasPage: React.FC = () => {
  const { data: cinemas = [], isLoading: loading, error, refetch } = useCinemas();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);

  // Filtered cinemas based only on real available data
  const filteredCinemas = useMemo(() => {
    return cinemas.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(query) ?? false;
        const matchAddress = c.address?.toLowerCase().includes(query) ?? false;
        return matchName || matchAddress;
      }
      return true;
    });
  }, [cinemas, statusFilter, searchQuery]);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10121a] via-[#161824] to-[#0d0e14] border border-[#242733] p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e6e2c1]/15 text-[#e6e2c1] text-xs font-bold tracking-wide uppercase border-none">
            <Sparkles className="w-3.5 h-3.5" /> Hệ Thống Cụm Rạp
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Khám Phá Các Cụm Rạp Chiếu Phim
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
            Tra cứu thông tin cụm rạp, địa chỉ, phòng chiếu và lựa chọn suất chiếu thuận tiện nhất cho bạn.
          </p>

          {/* Real stats banner */}
          <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-10 text-zinc-300 border-t border-[#20232e]">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-[#e6e2c1]" />
              <div>
                <div className="text-2xl font-bold text-white">{cinemas.length}</div>
                <div className="text-xs text-zinc-400">Cụm rạp trong hệ thống</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {cinemas.filter((c) => c.status === 'ACTIVE').length}
                </div>
                <div className="text-xs text-zinc-400">Cụm rạp đang hoạt động</div>
              </div>
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
          title="Không thể tải danh sách rạp phim"
          message={error instanceof Error ? error.message : 'Vui lòng kiểm tra lại kết nối mạng và thử lại.'}
          onRetry={() => refetch()}
        />
      ) : filteredCinemas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Không tìm thấy rạp chiếu nào phù hợp"
          description={
            searchQuery
              ? `Không có cụm rạp nào khớp với từ khóa "${searchQuery}".`
              : 'Hiện chưa có cụm rạp nào khả dụng.'
          }
          action={
            searchQuery || statusFilter !== 'ALL' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Đặt lại bộ lọc
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-zinc-400 px-1">
            <span>
              Hiển thị <strong className="text-white">{filteredCinemas.length}</strong> cụm rạp
            </span>
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

      {/* Detail Modal */}
      <CinemaDetailModal
        cinema={selectedCinema}
        onClose={() => setSelectedCinema(null)}
      />
    </div>
  );
};
