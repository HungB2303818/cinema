import React, { useState, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import type { Cinema } from '@/features/cinemas';
import { useCinemas, CinemaCard, CinemaDetailModal, CinemaHeroBanner } from '@/features/cinemas';
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
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Khám phá các rạp chiếu phim
        </h1>
      </header>
      {!loading && !error && <CinemaHeroBanner cinemas={cinemas} />}
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400 px-1">
            <span>
              Hiển thị <strong className="text-white">{filteredCinemas.length}</strong> cụm rạp
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>Đang hoạt động</span>
              <strong className="text-white">{cinemas.filter((cinema) => cinema.status === 'ACTIVE').length}</strong>
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
