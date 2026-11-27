import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { moviesApi, type Movie } from '@/features/movies';
import { adminCinemasApi, type Cinema } from '@/features/cinemas';
import { AlertMessage, Button } from '@/shared/components/ui';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { getVietnamDateString } from '@/shared/utils/format';
import {
  DEFAULT_PAGE_SIZE,
  GROUP_SORT,
  RevenueFiltersPanel,
  RevenueSummaryCards,
  RevenueTable,
  RevenueTrendChart,
  buildRevenueSearchParams,
  defaultRange,
  parseRevenueQuery,
  parsePositiveId,
  quickRange,
  revenueTabToExportGroupBy,
  revenueTabToGroupBy,
  sameFilterInput,
  useExportRevenue,
  useRevenueBreakdown,
  useRevenueDashboard,
  validateRevenueFilterInput,
  type QuickRange,
  type RevenueFilterErrors,
  type RevenueFilterInput,
  type RevenueTab,
  type RevenueTimeGroup,
} from '@/features/reports';

function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiErrorResponse) {
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi xem báo cáo.';
    }
    if (error.status === 403) {
      return 'Bạn không có quyền xem báo cáo doanh thu.';
    }
    if (error.code === 'REPORT_EXPORT_TOO_LARGE') {
      return 'Tệp CSV vượt quá 10.000 dòng dữ liệu. Vui lòng thu hẹp khoảng ngày hoặc bộ lọc.';
    }
    return error.message;
  }
  return 'Không thể tải báo cáo. Vui lòng kiểm tra kết nối và thử lại.';
}

export const AdminRevenuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasRole } = useAuth();
  const today = React.useMemo(() => getVietnamDateString(), []);
  const searchKey = searchParams.toString();
  const parsed = React.useMemo(
    () => parseRevenueQuery(new URLSearchParams(searchKey), today),
    [searchKey, today]
  );

  const [draft, setDraft] = React.useState<RevenueFilterInput>(parsed.input);
  const [fieldErrors, setFieldErrors] = React.useState<RevenueFilterErrors>({});
  const [movieKeyword, setMovieKeyword] = React.useState('');
  const [movieSearch, setMovieSearch] = React.useState('');

  const appliedSignature = [
    parsed.input.from,
    parsed.input.to,
    parsed.input.cinemaId,
    parsed.input.movieId,
  ].join('|');
  const lastAppliedSignature = React.useRef(appliedSignature);

  React.useEffect(() => {
    if (lastAppliedSignature.current !== appliedSignature) {
      lastAppliedSignature.current = appliedSignature;
      setDraft(parsed.input);
      setFieldErrors({});
    }
  }, [appliedSignature, parsed.input]);

  const movieCatalog = useInfiniteQuery({
    queryKey: ['admin', 'reports', 'catalog', 'movies', user?.id ?? 'anonymous', movieSearch],
    queryFn: ({ pageParam }) =>
      moviesApi.getAdminMovies({
        keyword: movieSearch || undefined,
        page: pageParam,
        size: 20,
        sort: 'title,asc',
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasRole('ADMIN'),
    staleTime: 30_000,
  });

  const cinemaCatalog = useInfiniteQuery({
    queryKey: ['admin', 'reports', 'catalog', 'cinemas', user?.id ?? 'anonymous'],
    queryFn: ({ pageParam }) => adminCinemasApi.listCinemas(pageParam, 20, 'name,asc'),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: hasRole('ADMIN'),
    staleTime: 30_000,
  });

  const movieOptions = React.useMemo(() => {
    const byId = new Map<number, Movie>();
    movieCatalog.data?.pages.forEach((page) =>
      page.content.forEach((movie) => byId.set(movie.id, movie))
    );
    return Array.from(byId.values());
  }, [movieCatalog.data]);

  const cinemaOptions = React.useMemo(() => {
    const byId = new Map<number, Cinema>();
    cinemaCatalog.data?.pages.forEach((page) =>
      page.content.forEach((cinema) => byId.set(cinema.id, cinema))
    );
    return Array.from(byId.values());
  }, [cinemaCatalog.data]);

  const selectedMovieId = parsePositiveId(draft.movieId);
  const selectedCinemaId = parsePositiveId(draft.cinemaId);

  const moviesWithSelection = React.useMemo(() => {
    if (selectedMovieId !== null && !movieOptions.some((movie) => movie.id === selectedMovieId)) {
      const fallback: Movie = {
        id: selectedMovieId,
        title: `Phim #${selectedMovieId}`,
        description: null,
        durationMinutes: 0,
        genre: null,
        ageRating: null,
        releaseDate: null,
        posterUrl: null,
        status: 'SHOWING',
      };
      return [...movieOptions, fallback];
    }
    return movieOptions;
  }, [movieOptions, selectedMovieId]);

  const cinemasWithSelection = React.useMemo(() => {
    if (
      selectedCinemaId !== null &&
      !cinemaOptions.some((cinema) => cinema.id === selectedCinemaId)
    ) {
      const fallback: Cinema = {
        id: selectedCinemaId,
        name: `Rạp #${selectedCinemaId}`,
        address: '',
        status: 'ACTIVE',
      };
      return [...cinemaOptions, fallback];
    }
    return cinemaOptions;
  }, [cinemaOptions, selectedCinemaId]);

  const appliedQuery = parsed.query;
  const groupBy = revenueTabToGroupBy(parsed.tab);
  const dashboardQuery = useRevenueDashboard(appliedQuery?.filters ?? null, parsed.timeGroup);
  const breakdownQuery = useRevenueBreakdown(
    appliedQuery?.filters ?? null,
    groupBy,
    parsed.page,
    parsed.size,
    GROUP_SORT
  );
  const exportMutation = useExportRevenue();

  const isDirty = !sameFilterInput(draft, parsed.input);
  const errors = { ...parsed.errors, ...fieldErrors };

  const applyFilters = (
    filters: RevenueFilterInput,
    overrides: Partial<{
      timeGroup: RevenueTimeGroup;
      tab: RevenueTab;
      page: number;
      size: number;
    }> = {}
  ) => {
    setSearchParams(
      buildRevenueSearchParams({
        filters: {
          from: filters.from,
          to: filters.to,
          cinemaId: parsePositiveId(filters.cinemaId),
          movieId: parsePositiveId(filters.movieId),
        },
        timeGroup: parsed.timeGroup,
        tab: parsed.tab,
        page: parsed.page,
        size: parsed.size,
        ...overrides,
      })
    );
  };

  const handleDraftChange = (patch: Partial<RevenueFilterInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFieldErrors({});
  };

  const handleApply = () => {
    const result = validateRevenueFilterInput(draft);
    setFieldErrors(result.errors);
    if (!result.filters) return;
    applyFilters(draft, { page: 0 });
  };

  const handleQuickRange = (kind: QuickRange) => {
    const range = quickRange(kind, today);
    const nextDraft = { ...draft, ...range };
    setDraft(nextDraft);
    const result = validateRevenueFilterInput(nextDraft);
    setFieldErrors(result.errors);
    if (result.filters) applyFilters(nextDraft, { page: 0 });
  };

  const handleReset = () => {
    const range = defaultRange(today);
    const nextDraft: RevenueFilterInput = {
      from: range.from,
      to: range.to,
      cinemaId: '',
      movieId: '',
    };
    setDraft(nextDraft);
    setFieldErrors({});
    setMovieKeyword('');
    setMovieSearch('');
    setSearchParams(
      buildRevenueSearchParams({
        filters: { ...range, cinemaId: null, movieId: null },
        timeGroup: 'DAY',
        tab: 'time',
        page: 0,
        size: DEFAULT_PAGE_SIZE,
      })
    );
  };

  const handleTabChange = (tab: RevenueTab) => {
    if (!appliedQuery) return;
    setSearchParams(buildRevenueSearchParams({ ...appliedQuery, tab, page: 0 }));
  };

  const handlePageChange = (page: number) => {
    if (!appliedQuery) return;
    setSearchParams(buildRevenueSearchParams({ ...appliedQuery, page }));
  };

  const handleSizeChange = (size: number) => {
    if (!appliedQuery) return;
    setSearchParams(buildRevenueSearchParams({ ...appliedQuery, page: 0, size }));
  };

  const handleTimeGroupChange = (timeGroup: RevenueTimeGroup) => {
    if (!appliedQuery) return;
    setSearchParams(buildRevenueSearchParams({ ...appliedQuery, timeGroup, page: 0 }));
  };

  const handleRefresh = () => {
    dashboardQuery.refetch();
    if (groupBy) breakdownQuery.refetch();
  };

  const handleExport = () => {
    if (!appliedQuery || isDirty) return;
    exportMutation.mutate({
      filters: appliedQuery.filters,
      groupBy: revenueTabToExportGroupBy(parsed.tab, parsed.timeGroup),
    });
  };

  const exportDisabled =
    !appliedQuery || isDirty || exportMutation.isPending || dashboardQuery.isFetching;

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-[#20232e] pb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Quản trị báo cáo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Doanh thu &amp; thống kê</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Số liệu từ thanh toán mô phỏng. Ngày thanh toán theo giờ Việt Nam
            (Asia/Ho_Chi_Minh).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!appliedQuery || dashboardQuery.isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${dashboardQuery.isFetching ? 'animate-spin' : ''}`}
            />
            <span>Làm mới</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            isLoading={exportMutation.isPending}
            disabled={exportDisabled}
            title={
              isDirty
                ? 'Áp dụng bộ lọc trước khi xuất CSV'
                : 'Xuất toàn bộ dữ liệu theo bộ lọc đã áp dụng'
            }
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </Button>
        </div>
      </div>

      {exportMutation.isError && (
        <AlertMessage variant="error">{reportErrorMessage(exportMutation.error)}</AlertMessage>
      )}

      <RevenueFiltersPanel
        draft={draft}
        errors={errors}
        cinemas={cinemasWithSelection}
        movies={moviesWithSelection}
        cinemasLoading={cinemaCatalog.isFetchingNextPage}
        moviesLoading={movieCatalog.isFetchingNextPage}
        cinemasError={cinemaCatalog.isError}
        moviesError={movieCatalog.isError}
        onRetryCinemas={() => cinemaCatalog.refetch()}
        onRetryMovies={() => movieCatalog.refetch()}
        hasMoreCinemas={Boolean(cinemaCatalog.hasNextPage)}
        hasMoreMovies={Boolean(movieCatalog.hasNextPage)}
        onLoadMoreCinemas={() => cinemaCatalog.fetchNextPage()}
        onLoadMoreMovies={() => movieCatalog.fetchNextPage()}
        movieKeyword={movieKeyword}
        onMovieKeywordChange={setMovieKeyword}
        onMovieSearch={() => setMovieSearch(movieKeyword.trim())}
        onDraftChange={handleDraftChange}
        onApply={handleApply}
        onReset={handleReset}
        onQuickRange={handleQuickRange}
        isDirty={isDirty}
      />

      {!appliedQuery ? (
        <AlertMessage variant="warning">
          Bộ lọc trên đường dẫn không hợp lệ. Vui lòng sửa các trường được đánh dấu và nhấn Áp dụng.
        </AlertMessage>
      ) : dashboardQuery.isError ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
          <AlertMessage variant="error">{reportErrorMessage(dashboardQuery.error)}</AlertMessage>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <RevenueSummaryCards
            summary={dashboardQuery.data?.summary ?? null}
            isLoading={dashboardQuery.isLoading}
          />

          <RevenueTrendChart
            points={dashboardQuery.data?.timeSeries ?? []}
            timeGroup={parsed.timeGroup}
            isLoading={dashboardQuery.isLoading}
            onTimeGroupChange={handleTimeGroupChange}
          />

          <RevenueTable
            tab={parsed.tab}
            timeGroup={parsed.timeGroup}
            timeSeries={dashboardQuery.data?.timeSeries ?? []}
            breakdown={breakdownQuery.data ?? null}
            isLoading={
              parsed.tab === 'time' ? dashboardQuery.isLoading : breakdownQuery.isLoading
            }
            isError={parsed.tab === 'time' ? dashboardQuery.isError : breakdownQuery.isError}
            isFetching={
              parsed.tab === 'time' ? dashboardQuery.isFetching : breakdownQuery.isFetching
            }
            generatedAt={
              parsed.tab === 'time'
                ? dashboardQuery.data?.generatedAt
                : breakdownQuery.data?.generatedAt
            }
            onTabChange={handleTabChange}
            onRetry={handleRefresh}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
          />
        </>
      )}
    </div>
  );
};
