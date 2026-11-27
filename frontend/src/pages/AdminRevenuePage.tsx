import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Download,
  Film,
  MapPin,
  Printer,
  RefreshCw,
  User,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { moviesApi, type Movie } from '@/features/movies';
import { adminCinemasApi, type Cinema } from '@/features/cinemas';
import { AlertMessage, Button } from '@/shared/components/ui';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { formatDate, getVietnamDateString } from '@/shared/utils/format';
import {
  DEFAULT_PAGE_SIZE,
  GROUP_SORT,
  RevenueBreakdownCharts,
  RevenueFiltersPanel,
  RevenueKeyFindings,
  RevenueSummaryCards,
  RevenueTable,
  RevenueTrendChart,
  buildRevenueSearchParams,
  daysInclusive,
  defaultRange,
  formatReportGeneratedAt,
  parsePositiveId,
  parseRevenueQuery,
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

const SECTION_LINKS = [
  { href: '#tong-quan', label: 'Tổng quan KPI' },
  { href: '#nhan-dinh', label: 'Nhận định nổi bật' },
  { href: '#xu-huong', label: 'Biểu đồ xu hướng' },
  { href: '#co-cau', label: 'Cơ cấu phim & rạp' },
  { href: '#chi-tiet', label: 'Bảng chi tiết' },
];

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
  const [tableSort, setTableSort] = React.useState<string>(GROUP_SORT);

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
    tableSort
  );

  // Top 5 Movies & Cinemas for Revenue Structure Charts and Key Findings
  const topMoviesQuery = useRevenueBreakdown(
    appliedQuery?.filters ?? null,
    'MOVIE',
    0,
    5,
    GROUP_SORT
  );
  const topCinemasQuery = useRevenueBreakdown(
    appliedQuery?.filters ?? null,
    'CINEMA',
    0,
    5,
    GROUP_SORT
  );

  const exportMutation = useExportRevenue();

  const isDirty = !sameFilterInput(draft, parsed.input);
  const errors = { ...parsed.errors, ...fieldErrors };

  const activeQuickRange = React.useMemo<QuickRange | null>(() => {
    const presets: QuickRange[] = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth'];
    for (const preset of presets) {
      const r = quickRange(preset, today);
      if (draft.from === r.from && draft.to === r.to) return preset;
    }
    return null;
  }, [draft.from, draft.to, today]);

  const activeCinemaName = React.useMemo(() => {
    const id = appliedQuery?.filters.cinemaId;
    if (!id) return 'Tất cả rạp';
    return cinemasWithSelection.find((c) => c.id === id)?.name ?? `Rạp #${id}`;
  }, [appliedQuery?.filters.cinemaId, cinemasWithSelection]);

  const activeMovieTitle = React.useMemo(() => {
    const id = appliedQuery?.filters.movieId;
    if (!id) return 'Tất cả phim';
    return moviesWithSelection.find((m) => m.id === id)?.title ?? `Phim #${id}`;
  }, [appliedQuery?.filters.movieId, moviesWithSelection]);

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
    setTableSort(GROUP_SORT);
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

  const handleDrillDown = (target: 'movie' | 'cinema', id: number) => {
    const nextDraft: RevenueFilterInput = {
      ...parsed.input,
      movieId: target === 'movie' ? String(id) : parsed.input.movieId,
      cinemaId: target === 'cinema' ? String(id) : parsed.input.cinemaId,
    };
    setDraft(nextDraft);
    applyFilters(nextDraft, { page: 0 });
  };

  const handleTabChange = (tab: RevenueTab) => {
    if (!appliedQuery) return;
    setTableSort(GROUP_SORT);
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
    topMoviesQuery.refetch();
    topCinemasQuery.refetch();
  };

  const handleExport = () => {
    if (!appliedQuery || isDirty) return;
    exportMutation.mutate({
      filters: appliedQuery.filters,
      groupBy: revenueTabToExportGroupBy(parsed.tab, parsed.timeGroup),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const exportDisabled =
    !appliedQuery || isDirty || exportMutation.isPending || dashboardQuery.isFetching;

  const generatedAt = dashboardQuery.data?.generatedAt;
  const totalDays = appliedQuery
    ? daysInclusive(appliedQuery.filters.from, appliedQuery.filters.to)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Report Header & Metadata Bar */}
      <header className="border-b border-[#20232e] pb-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Doanh thu &amp; thống kê</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Số liệu từ thanh toán mô phỏng. Ngày thanh toán theo giờ Việt Nam (Asia/Ho_Chi_Minh).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto print:hidden">
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
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!appliedQuery}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>In / PDF</span>
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

        {/* Report Metadata Context Strip */}
        {appliedQuery && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-200 font-medium tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {formatDate(appliedQuery.filters.from)} – {formatDate(appliedQuery.filters.to)} (
                {totalDays} ngày)
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13151d] border border-[#242733] text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeCinemaName}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13151d] border border-[#242733] text-zinc-200">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeMovieTitle}</span>
            </span>

            {user?.fullName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13151d] border border-[#242733] text-zinc-300">
                <User className="w-3.5 h-3.5 text-violet-400" />
                <span>{user.fullName}</span>
              </span>
            )}

            {generatedAt && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13151d] border border-[#242733] text-zinc-400 ml-auto tabular-nums">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Cập nhật: {formatReportGeneratedAt(generatedAt)}</span>
              </span>
            )}
          </div>
        )}

        {/* Section Jump Nav (Table of Contents) */}
        {appliedQuery && !dashboardQuery.isError && (
          <nav
            aria-label="Mục lục báo cáo"
            className="flex flex-wrap items-center gap-1.5 pt-1 print:hidden"
          >
            <span className="text-xs text-zinc-500 mr-1">Chuyển nhanh:</span>
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1a1d28] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

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
        activeQuickRange={activeQuickRange}
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
            timeSeries={dashboardQuery.data?.timeSeries ?? []}
            isLoading={dashboardQuery.isLoading}
          />

          <RevenueKeyFindings
            summary={dashboardQuery.data?.summary ?? null}
            timeSeries={dashboardQuery.data?.timeSeries ?? []}
            timeGroup={parsed.timeGroup}
            topMovie={topMoviesQuery.data?.rows.content[0] ?? null}
            topCinema={topCinemasQuery.data?.rows.content[0] ?? null}
            isLoading={dashboardQuery.isLoading}
          />

          <RevenueTrendChart
            points={dashboardQuery.data?.timeSeries ?? []}
            timeGroup={parsed.timeGroup}
            isLoading={dashboardQuery.isLoading}
            onTimeGroupChange={handleTimeGroupChange}
          />

          <RevenueBreakdownCharts
            totalRevenue={dashboardQuery.data?.summary.totalRevenue ?? '0'}
            topMovies={topMoviesQuery.data?.rows.content ?? []}
            topCinemas={topCinemasQuery.data?.rows.content ?? []}
            moviesLoading={topMoviesQuery.isLoading}
            cinemasLoading={topCinemasQuery.isLoading}
            onSelectMovie={(movieId) => handleDrillDown('movie', movieId)}
            onSelectCinema={(cinemaId) => handleDrillDown('cinema', cinemaId)}
          />

          <RevenueTable
            tab={parsed.tab}
            timeGroup={parsed.timeGroup}
            timeSeries={dashboardQuery.data?.timeSeries ?? []}
            totalRevenue={dashboardQuery.data?.summary.totalRevenue ?? '0'}
            breakdown={breakdownQuery.data ?? null}
            sort={tableSort}
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
            onSortChange={(nextSort) => {
              setTableSort(nextSort);
              if (appliedQuery && appliedQuery.page !== 0) {
                setSearchParams(buildRevenueSearchParams({ ...appliedQuery, page: 0 }));
              }
            }}
            onDrillDown={handleDrillDown}
            onRetry={handleRefresh}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
          />
        </>
      )}
    </div>
  );
};
