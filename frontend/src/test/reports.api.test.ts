import { describe, it, expect, vi, afterEach } from 'vitest';
import { httpClient, ApiErrorResponse } from '@/shared/api/http-client';
import { reportsApi } from '@/features/reports';

const filters = { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null };

describe('Reports API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds dashboard params with timeGroup and omits empty ids', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        filter: filters,
        timeGroup: 'DAY',
        summary: {
          totalRevenue: '0.00',
          successfulPayments: 0,
          ticketsSold: 0,
          averageRevenuePerPayment: '0.00',
        },
        timeSeries: [],
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        generatedAt: '2026-11-10T03:00:00Z',
      },
    });

    await reportsApi.dashboard(filters, 'DAY');

    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('/admin/reports/revenue/dashboard?');
    expect(url).toContain('from=2026-11-01');
    expect(url).toContain('to=2026-11-10');
    expect(url).toContain('timeGroup=DAY');
    expect(url).not.toContain('cinemaId');
    expect(url).not.toContain('movieId');
  });

  it('builds breakdown params with group, pagination, sort and filters', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        filter: { ...filters, cinemaId: 2, movieId: 5 },
        groupBy: 'CINEMA',
        rows: { content: [], page: 1, size: 50, totalElements: 0, totalPages: 0 },
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        generatedAt: '2026-11-10T03:00:00Z',
      },
    });

    await reportsApi.breakdown({ ...filters, cinemaId: 2, movieId: 5 }, 'CINEMA', 1, 50, 'groupName,asc');

    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('/breakdown?');
    expect(url).toContain('cinemaId=2');
    expect(url).toContain('movieId=5');
    expect(url).toContain('groupBy=CINEMA');
    expect(url).toContain('page=1');
    expect(url).toContain('size=50');
    expect(url).toContain('sort=groupName%2Casc');
  });

  it('parses RFC 5987 and plain filenames, falling back to revenue.csv', async () => {
    const getSpy = vi.spyOn(httpClient, 'get');

    getSpy.mockResolvedValueOnce({
      data: new Blob(['csv']),
      headers: { 'content-disposition': "attachment; filename*=UTF-8''bao-cao-doanh-thu.csv" },
    });
    await expect(reportsApi.exportCsv(filters, 'DAY')).resolves.toMatchObject({
      filename: 'bao-cao-doanh-thu.csv',
    });

    getSpy.mockResolvedValueOnce({
      data: new Blob(['csv']),
      headers: { 'content-disposition': 'attachment; filename="revenue_2026-11-01_2026-11-10_by-movie.csv"' },
    });
    await expect(reportsApi.exportCsv(filters, 'MOVIE')).resolves.toMatchObject({
      filename: 'revenue_2026-11-01_2026-11-10_by-movie.csv',
    });

    getSpy.mockResolvedValueOnce({ data: new Blob(['csv']), headers: {} });
    await expect(reportsApi.exportCsv(filters, 'CINEMA')).resolves.toMatchObject({
      filename: 'revenue.csv',
    });
  });

  it('normalizes a JSON error inside the CSV blob', async () => {
    const blob = new Blob(['ignored']);
    Object.defineProperty(blob, 'text', {
      value: vi.fn().mockResolvedValue(
        JSON.stringify({
          message: 'Tệp CSV vượt quá 10.000 dòng dữ liệu. Vui lòng thu hẹp khoảng ngày hoặc bộ lọc.',
          code: 'REPORT_EXPORT_TOO_LARGE',
          status: 422,
          path: '/api/admin/reports/revenue/export',
        })
      ),
    });

    vi.spyOn(httpClient, 'get').mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: blob },
    });

    await expect(reportsApi.exportCsv(filters, 'DAY')).rejects.toMatchObject({
      code: 'REPORT_EXPORT_TOO_LARGE',
      status: 422,
      path: '/api/admin/reports/revenue/export',
    });
  });

  it('rethrows a non-JSON blob error unchanged', async () => {
    const blob = new Blob(['ignored']);
    Object.defineProperty(blob, 'text', {
      value: vi.fn().mockResolvedValue('<html>bad gateway</html>'),
    });
    const original = {
      isAxiosError: true,
      response: { status: 502, data: blob },
    };

    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(original);

    await expect(reportsApi.exportCsv(filters, 'DAY')).rejects.toBe(original);
  });

  it('keeps ApiErrorResponse instance for normalized errors', async () => {
    const blob = new Blob(['ignored']);
    Object.defineProperty(blob, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify({ code: 'API_ERROR' })),
    });

    vi.spyOn(httpClient, 'get').mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: blob },
    });

    await expect(reportsApi.exportCsv(filters, 'DAY')).rejects.toBeInstanceOf(ApiErrorResponse);
  });
});
