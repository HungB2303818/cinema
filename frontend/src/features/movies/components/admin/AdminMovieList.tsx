import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Film,
  Search,
  Plus,
  Edit3,
  EyeOff,
  RotateCcw,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Pagination } from '@/shared/components/ui/Pagination';
import { Modal } from '@/shared/components/ui/Modal';
import { getAgeRatingBadge, formatDate } from '@/shared/utils';
import { useAdminMovies } from '../../hooks/useAdminMovies';
import { useUpdateMovie } from '../../hooks/useUpdateMovie';
import type { Movie, MovieStatus, MovieRequest } from '../../types/movie.types';

export const AdminMovieList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const keywordParam = searchParams.get('keyword') || '';
  const statusParam = (searchParams.get('status') as MovieStatus) || undefined;
  const genreParam = searchParams.get('genre') || '';
  const sortParam = searchParams.get('sort') || 'releaseDate,desc';
  const pageParam = Math.max(0, parseInt(searchParams.get('page') || '0', 10));

  // Local search input for debouncing
  const [searchInput, setSearchInput] = useState(keywordParam);
  const [prevKeywordParam, setPrevKeywordParam] = useState(keywordParam);
  if (prevKeywordParam !== keywordParam) {
    setPrevKeywordParam(keywordParam);
    setSearchInput(keywordParam);
  }

  // Debounce search query update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== keywordParam) {
        const next = new URLSearchParams(searchParams);
        if (searchInput.trim()) {
          next.set('keyword', searchInput.trim());
        } else {
          next.delete('keyword');
        }
        next.set('page', '0');
        setSearchParams(next);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, keywordParam, searchParams, setSearchParams]);

  // Fetch admin movies query
  const { data, isLoading, isError, error, refetch } = useAdminMovies({
    keyword: keywordParam || undefined,
    status: statusParam,
    genre: genreParam || undefined,
    sort: sortParam,
    page: pageParam,
    size: 15,
  });

  const updateMutation = useUpdateMovie();

  // Modal state for Hide Movie
  const [movieToHide, setMovieToHide] = useState<Movie | null>(null);
  const [hideConfirming, setHideConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal state for Restore Movie
  const [movieToRestore, setMovieToRestore] = useState<Movie | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<MovieStatus>('SHOWING');
  const [restoreConfirming, setRestoreConfirming] = useState(false);

  // Filter handlers
  const handleStatusFilterChange = (status: string) => {
    const next = new URLSearchParams(searchParams);
    if (status) {
      next.set('status', status);
    } else {
      next.delete('status');
    }
    next.set('page', '0');
    setSearchParams(next);
  };

  const handleGenreFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const next = new URLSearchParams(searchParams);
    if (val.trim()) {
      next.set('genre', val.trim());
    } else {
      next.delete('genre');
    }
    next.set('page', '0');
    setSearchParams(next);
  };

  const handleSortChange = (sort: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', sort);
    next.set('page', '0');
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
  };

  // Execute Hide Movie (PUT with status=HIDDEN, preserving other metadata)
  const executeHide = async () => {
    if (!movieToHide || hideConfirming) return;
    setHideConfirming(true);
    setActionError(null);

    const payload: MovieRequest = {
      title: movieToHide.title,
      durationMinutes: movieToHide.durationMinutes,
      status: 'HIDDEN',
      description: movieToHide.description,
      genre: movieToHide.genre,
      ageRating: movieToHide.ageRating,
      releaseDate: movieToHide.releaseDate,
      posterUrl: movieToHide.posterUrl,
    };

    try {
      await updateMutation.mutateAsync({ id: movieToHide.id, data: payload });
      setMovieToHide(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Không thể ẩn phim.');
    } finally {
      setHideConfirming(false);
    }
  };

  // Execute Restore Movie (PUT with selected public status)
  const executeRestore = async () => {
    if (!movieToRestore || restoreConfirming) return;
    setRestoreConfirming(true);
    setActionError(null);

    const payload: MovieRequest = {
      title: movieToRestore.title,
      durationMinutes: movieToRestore.durationMinutes,
      status: restoreStatus,
      description: movieToRestore.description,
      genre: movieToRestore.genre,
      ageRating: movieToRestore.ageRating,
      releaseDate: movieToRestore.releaseDate,
      posterUrl: movieToRestore.posterUrl,
    };

    try {
      await updateMutation.mutateAsync({ id: movieToRestore.id, data: payload });
      setMovieToRestore(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Không thể khôi phục phim.');
    } finally {
      setRestoreConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-xs font-bold uppercase tracking-wider mb-1">
            <Film className="w-4 h-4" />
            <span>Danh mục quản trị</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Quản lý Phim & Poster</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Thêm mới, cập nhật thông tin phim, tải poster Cloudinary và điều chỉnh trạng thái hiển thị
          </p>
        </div>
        <Link to="/admin/movies/new">
          <Button variant="primary" size="md" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Thêm phim mới</span>
          </Button>
        </Link>
      </div>

      {/* Top action bar: Search, filters, Add button */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#12141c] p-4 sm:p-5 rounded-3xl border border-[#242733] shadow-lg">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên phim..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#090a0f] border border-[#262934] rounded-2xl text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <select
            value={statusParam || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            aria-label="Lọc theo trạng thái"
            className="px-3 py-2 bg-[#090a0f] border border-[#262934] rounded-2xl text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SHOWING">Đang chiếu (SHOWING)</option>
            <option value="UPCOMING">Sắp chiếu (UPCOMING)</option>
            <option value="ENDED">Đã kết thúc (ENDED)</option>
            <option value="HIDDEN">Đã ẩn (HIDDEN)</option>
          </select>

          {/* Genre filter */}
          <input
            type="text"
            placeholder="Thể loại..."
            defaultValue={genreParam}
            onBlur={handleGenreFilterChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGenreFilterChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
              }
            }}
            className="w-28 sm:w-36 px-3 py-2 bg-[#090a0f] border border-[#262934] rounded-2xl text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-[#e6e2c1]"
          />

          {/* Sort select */}
          <select
            value={sortParam}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sắp xếp danh sách phim"
            className="px-3 py-2 bg-[#090a0f] border border-[#262934] rounded-2xl text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
          >
            <option value="releaseDate,desc">Mới nhất</option>
            <option value="releaseDate,asc">Cũ nhất</option>
            <option value="title,asc">Tên A-Z</option>
            <option value="title,desc">Tên Z-A</option>
            <option value="durationMinutes,desc">Thời lượng giảm dần</option>
            <option value="durationMinutes,asc">Thời lượng tăng dần</option>
          </select>
        </div>
      </div>

      {/* Main content table / card list */}
      {isLoading ? (
        <LoadingSpinner message="Đang tải danh sách phim quản trị..." className="py-24" />
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách phim"
          message={error?.message || 'Đã có lỗi xảy ra khi truy vấn dữ liệu từ máy chủ.'}
          onRetry={() => refetch()}
        />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Không tìm thấy phim phù hợp"
          description="Chưa có phim nào khớp với điều kiện lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc thêm phim mới."
          action={
            <Link to="/admin/movies/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Thêm phim ngay</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Table container */}
          <div className="overflow-x-auto rounded-3xl border border-[#242733] bg-[#12141c] shadow-xl">
            <table className="w-full text-left text-sm text-zinc-200 border-collapse">
              <thead className="bg-[#0b0c11] border-b border-[#242733] text-xs font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th scope="col" className="px-5 py-4 w-16">Poster</th>
                  <th scope="col" className="px-5 py-4">Tên phim</th>
                  <th scope="col" className="px-5 py-4">Thể loại</th>
                  <th scope="col" className="px-5 py-4">Thời lượng</th>
                  <th scope="col" className="px-5 py-4">Ngày phát hành</th>
                  <th scope="col" className="px-5 py-4">Trạng thái</th>
                  <th scope="col" className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202a]">
                {data.content.map((movie) => {
                  const ageBadge = getAgeRatingBadge(movie.ageRating);
                  const isHidden = movie.status === 'HIDDEN';

                  return (
                    <tr
                      key={movie.id}
                      className={`hover:bg-[#181a24]/60 transition-colors ${
                        isHidden ? 'bg-black/40 opacity-75' : ''
                      }`}
                    >
                      {/* Poster thumbnail */}
                      <td className="px-5 py-3.5">
                        <div className="w-12 h-16 rounded-xl bg-[#090a0f] border border-[#262934] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                          {movie.posterUrl ? (
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback on broken image link
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span title="Không có ảnh" aria-label="Không có ảnh">
                              <Film className="w-5 h-5 text-zinc-600" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title & Age Rating */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white text-base leading-snug">
                          {movie.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${ageBadge.color}`}>
                            {ageBadge.label}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">ID: #{movie.id}</span>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="px-5 py-3.5 text-zinc-300">
                        {movie.genre || <span className="text-zinc-600 italic">Chưa đặt</span>}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-[#e6e2c1]" />
                          <span>{movie.durationMinutes} phút</span>
                        </div>
                      </td>

                      {/* Release date */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{formatDate(movie.releaseDate)}</span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={movie.status} size="sm" />
                      </td>

                      {/* Actions: Edit, Hide, Restore */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/admin/movies/${movie.id}/edit`}>
                            <button
                              type="button"
                              aria-label={`Sửa phim ${movie.title}`}
                              className="p-2 rounded-xl bg-[#1a1c26] hover:bg-[#252836] text-zinc-200 hover:text-white transition-colors cursor-pointer border-none"
                              title="Sửa thông tin phim"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </Link>

                          {isHidden ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMovieToRestore(movie);
                                setRestoreStatus('SHOWING');
                                setActionError(null);
                              }}
                              aria-label={`Khôi phục phim ${movie.title}`}
                              className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 transition-colors cursor-pointer border-none"
                              title="Khôi phục phim ẩn"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMovieToHide(movie);
                                setActionError(null);
                              }}
                              aria-label={`Ẩn phim ${movie.title}`}
                              className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-100 transition-colors cursor-pointer border-none"
                              title="Ẩn phim khỏi trang khách"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-zinc-400">
              Hiển thị{' '}
              <strong className="text-zinc-200">{data.content.length}</strong> / tổng số{' '}
              <strong className="text-zinc-200">{data.totalElements}</strong> phim
            </div>
            <Pagination
              currentPage={pageParam}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Modal: Xác nhận ẩn phim */}
      <Modal
        isOpen={Boolean(movieToHide)}
        onClose={() => setMovieToHide(null)}
        title="Xác nhận ẩn phim"
        maxWidth="md"
      >
        {movieToHide && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                Phim <strong>{movieToHide.title}</strong> sẽ được chuyển sang trạng thái{' '}
                <span className="font-bold text-amber-300">HIDDEN</span>. Phim sẽ không còn hiển thị
                trên trang công khai của khách hàng, nhưng toàn bộ lịch chiếu và lịch sử đơn đặt vé liên
                quan vẫn được bảo toàn nguyên vẹn.
              </div>
            </div>

            {actionError && (
              <p className="text-xs text-red-400 font-medium">{actionError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMovieToHide(null)}
                disabled={hideConfirming}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={executeHide}
                isLoading={hideConfirming}
                disabled={hideConfirming}
              >
                Xác nhận ẩn phim
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Xác nhận khôi phục phim */}
      <Modal
        isOpen={Boolean(movieToRestore)}
        onClose={() => setMovieToRestore(null)}
        title="Khôi phục phim công khai"
        maxWidth="md"
      >
        {movieToRestore && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                Khôi phục phim <strong>{movieToRestore.title}</strong> để hiển thị lại trên trang công
                khai. Vui lòng chọn trạng thái công khai phù hợp:
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="restore-status" className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Trạng thái hiển thị
              </label>
              <select
                id="restore-status"
                value={restoreStatus}
                onChange={(e) => setRestoreStatus(e.target.value as MovieStatus)}
                className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#262934] rounded-2xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
              >
                <option value="SHOWING">Đang chiếu (SHOWING)</option>
                <option value="UPCOMING">Sắp chiếu (UPCOMING)</option>
                <option value="ENDED">Đã kết thúc (ENDED)</option>
              </select>
            </div>

            {actionError && (
              <p className="text-xs text-red-400 font-medium">{actionError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMovieToRestore(null)}
                disabled={restoreConfirming}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={executeRestore}
                isLoading={restoreConfirming}
                disabled={restoreConfirming}
              >
                Xác nhận khôi phục
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
