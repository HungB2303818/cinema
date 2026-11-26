import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  MAX_RANGE_DAYS,
  addDays,
  buildRevenueSearchParams,
  daysInclusive,
  defaultRange,
  isValidIsoDate,
  parsePositiveId,
  parseRevenueQuery,
  quickRange,
  revenueTabToExportGroupBy,
  revenueTabToGroupBy,
  sameFilterInput,
  validateRevenueFilterInput,
} from '@/features/reports';

describe('report filters', () => {
  it('builds the default range from the first day of the month to today', () => {
    expect(defaultRange('2026-11-26')).toEqual({ from: '2026-11-01', to: '2026-11-26' });
  });

  it('builds quick ranges including month and year boundaries', () => {
    expect(quickRange('today', '2026-11-26')).toEqual({ from: '2026-11-26', to: '2026-11-26' });
    expect(quickRange('last7', '2026-11-26')).toEqual({ from: '2026-11-20', to: '2026-11-26' });
    expect(quickRange('thisMonth', '2026-11-26')).toEqual({ from: '2026-11-01', to: '2026-11-26' });
    expect(quickRange('lastMonth', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(quickRange('lastMonth', '2024-03-31')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('adds days without depending on the machine timezone', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('validates real ISO dates and inclusive day counts', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('26-02-01')).toBe(false);
    expect(daysInclusive('2026-11-01', '2026-11-01')).toBe(1);
    expect(daysInclusive('2026-01-01', '2027-01-01')).toBe(366);
  });

  it('parses positive ids only', () => {
    expect(parsePositiveId('7')).toBe(7);
    expect(parsePositiveId(' 12 ')).toBe(12);
    expect(parsePositiveId('')).toBeNull();
    expect(parsePositiveId('0')).toBeNull();
    expect(parsePositiveId('-1')).toBeNull();
    expect(parsePositiveId('1.5')).toBeNull();
    expect(parsePositiveId('abc')).toBeNull();
  });

  it('rejects missing, reversed and oversized ranges', () => {
    expect(validateRevenueFilterInput({ from: '', to: '', cinemaId: '', movieId: '' }).errors)
      .toMatchObject({ from: expect.any(String), to: expect.any(String) });

    expect(
      validateRevenueFilterInput({
        from: '2026-11-10',
        to: '2026-11-01',
        cinemaId: '',
        movieId: '',
      }).errors.range
    ).toContain('trước hoặc bằng');

    expect(
      validateRevenueFilterInput({
        from: '2026-01-01',
        to: '2027-01-02',
        cinemaId: '',
        movieId: '',
      }).errors.range
    ).toContain(String(MAX_RANGE_DAYS));
  });

  it('accepts exactly the maximum range and valid optional filters', () => {
    const result = validateRevenueFilterInput({
      from: '2026-01-01',
      to: '2027-01-01',
      cinemaId: '3',
      movieId: '9',
    });
    expect(result.errors).toEqual({});
    expect(result.filters).toEqual({
      from: '2026-01-01',
      to: '2027-01-01',
      cinemaId: 3,
      movieId: 9,
    });
  });

  it('rejects invalid optional ids', () => {
    const result = validateRevenueFilterInput({
      from: '2026-11-01',
      to: '2026-11-02',
      cinemaId: 'abc',
      movieId: '-2',
    });
    expect(result.filters).toBeNull();
    expect(result.errors.cinemaId).toBeTruthy();
    expect(result.errors.movieId).toBeTruthy();
  });

  it('parses the URL with safe defaults', () => {
    const parsed = parseRevenueQuery(new URLSearchParams(), '2026-11-26');
    expect(parsed.input).toEqual({
      from: '2026-11-01',
      to: '2026-11-26',
      cinemaId: '',
      movieId: '',
    });
    expect(parsed.errors).toEqual({});
    expect(parsed.timeGroup).toBe('DAY');
    expect(parsed.tab).toBe('time');
    expect(parsed.page).toBe(0);
    expect(parsed.size).toBe(DEFAULT_PAGE_SIZE);
    expect(parsed.query).not.toBeNull();
  });

  it('parses valid URL state and falls back on invalid page or size', () => {
    const parsed = parseRevenueQuery(
      new URLSearchParams(
        'from=2026-10-01&to=2026-10-31&cinemaId=2&movieId=5&timeGroup=MONTH&tab=cinema&page=2&size=50'
      ),
      '2026-11-26'
    );
    expect(parsed.query).toEqual({
      filters: { from: '2026-10-01', to: '2026-10-31', cinemaId: 2, movieId: 5 },
      timeGroup: 'MONTH',
      tab: 'cinema',
      page: 2,
      size: 50,
    });

    const fallback = parseRevenueQuery(
      new URLSearchParams('from=2026-10-01&to=2026-10-31&page=-3&size=15&tab=other'),
      '2026-11-26'
    );
    expect(fallback.page).toBe(0);
    expect(fallback.size).toBe(DEFAULT_PAGE_SIZE);
    expect(fallback.tab).toBe('time');
  });

  it('returns a null query when the URL carries invalid filters', () => {
    const parsed = parseRevenueQuery(
      new URLSearchParams('from=2026-02-30&to=2026-03-01'),
      '2026-11-26'
    );
    expect(parsed.query).toBeNull();
    expect(parsed.errors.from).toBeTruthy();
  });

  it('round-trips query state through search params', () => {
    const params = buildRevenueSearchParams({
      filters: { from: '2026-10-01', to: '2026-10-31', cinemaId: 2, movieId: null },
      timeGroup: 'MONTH',
      tab: 'movie',
      page: 1,
      size: 10,
    });
    const parsed = parseRevenueQuery(params, '2026-11-26');
    expect(parsed.query).toEqual({
      filters: { from: '2026-10-01', to: '2026-10-31', cinemaId: 2, movieId: null },
      timeGroup: 'MONTH',
      tab: 'movie',
      page: 1,
      size: 10,
    });
    expect(params.has('movieId')).toBe(false);
  });

  it('maps tabs to breakdown and export groups', () => {
    expect(revenueTabToGroupBy('time')).toBeNull();
    expect(revenueTabToGroupBy('movie')).toBe('MOVIE');
    expect(revenueTabToGroupBy('cinema')).toBe('CINEMA');

    expect(revenueTabToExportGroupBy('time', 'DAY')).toBe('DAY');
    expect(revenueTabToExportGroupBy('time', 'MONTH')).toBe('MONTH');
    expect(revenueTabToExportGroupBy('movie', 'MONTH')).toBe('MOVIE');
    expect(revenueTabToExportGroupBy('cinema', 'DAY')).toBe('CINEMA');
  });

  it('compares draft inputs ignoring surrounding whitespace', () => {
    const base = { from: '2026-11-01', to: '2026-11-02', cinemaId: '', movieId: '3' };
    expect(sameFilterInput(base, { ...base })).toBe(true);
    expect(sameFilterInput(base, { ...base, cinemaId: ' 2 ' })).toBe(false);
    expect(
      sameFilterInput(
        { ...base, from: ' 2026-11-01 ' },
        { ...base, from: '2026-11-01' }
      )
    ).toBe(true);
  });
});
