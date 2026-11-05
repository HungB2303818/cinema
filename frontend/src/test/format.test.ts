import { describe, it, expect } from 'vitest';
import {
  getVietnamDateString,
  isPastCutoff,
  formatCurrency,
  formatTime,
  formatDate,
  getMovieStatusBadge,
  getAgeRatingBadge,
} from '@/shared/utils/format';

describe('format utilities & Vietnam timezone (TC-26, TC-37)', () => {
  it('correctly calculates Vietnam date (Asia/Ho_Chi_Minh) around UTC boundary', () => {
    // 2026-11-04 18:30:00 UTC = 2026-11-05 01:30:00 in Vietnam (UTC+7)
    const earlyMorningVietnam = new Date('2026-11-04T18:30:00Z');
    expect(getVietnamDateString(earlyMorningVietnam)).toBe('2026-11-05');
    // Notice that earlyMorningVietnam.toISOString().split('T')[0] would be '2026-11-04' (WRONG!)
    expect(earlyMorningVietnam.toISOString().split('T')[0]).toBe('2026-11-04');

    // 2026-11-05 16:59:59 UTC = 2026-11-05 23:59:59 in Vietnam
    const endOfDayVietnam = new Date('2026-11-05T16:59:59Z');
    expect(getVietnamDateString(endOfDayVietnam)).toBe('2026-11-05');

    // 2026-11-05 17:00:01 UTC = 2026-11-06 00:00:01 in Vietnam
    const nextDayVietnam = new Date('2026-11-05T17:00:01Z');
    expect(getVietnamDateString(nextDayVietnam)).toBe('2026-11-06');
  });

  it('formats date and time accurately in Vietnam timezone', () => {
    const testUtc = '2026-11-10T13:45:00Z'; // 20:45 in Vietnam
    expect(formatTime(testUtc)).toBe('20:45');
    expect(formatDate('2026-11-10')).toBe('10/11/2026');
  });

  it('formats currency in VND', () => {
    expect(formatCurrency(75000)).toContain('75.000');
    expect(formatCurrency(75000)).toContain('₫');
  });

  it('maps movie status correctly (SHOWING, UPCOMING, ENDED, HIDDEN)', () => {
    expect(getMovieStatusBadge('SHOWING').label).toBe('Đang chiếu');
    expect(getMovieStatusBadge('UPCOMING').label).toBe('Sắp chiếu');
    expect(getMovieStatusBadge('ENDED').label).toBe('Đã kết thúc');
    expect(getMovieStatusBadge('HIDDEN').label).toBe('Đã ẩn');
  });

  it('maps age rating badges correctly', () => {
    expect(getAgeRatingBadge('P').label).toContain('Phổ biến');
    expect(getAgeRatingBadge('T18').label).toContain('18+');
  });
});

describe('booking cutoff evaluation (BR-08, TC-19)', () => {
  const startsAt = '2026-11-10T10:00:00Z'; // 10:00 UTC

  it('permits booking when now is before startsAt - 10 minutes', () => {
    // 09:49:00 UTC -> 11 minutes before start
    const now = new Date('2026-11-10T09:49:00Z');
    expect(isPastCutoff(startsAt, null, 10, now)).toBe(false);
  });

  it('blocks booking when now is exactly at startsAt - 10 minutes', () => {
    // 09:50:00 UTC -> exactly 10 minutes before start
    const now = new Date('2026-11-10T09:50:00Z');
    expect(isPastCutoff(startsAt, null, 10, now)).toBe(true);
  });

  it('blocks booking when now is past startsAt - 10 minutes', () => {
    // 09:55:00 UTC -> 5 minutes before start
    const now = new Date('2026-11-10T09:55:00Z');
    expect(isPastCutoff(startsAt, null, 10, now)).toBe(true);
  });

  it('respects bookingClosesAt when provided by server contract', () => {
    const bookingClosesAt = '2026-11-10T09:45:00Z';
    // Before closesAt
    expect(isPastCutoff(startsAt, bookingClosesAt, 10, new Date('2026-11-10T09:44:00Z'))).toBe(false);
    // At/after closesAt
    expect(isPastCutoff(startsAt, bookingClosesAt, 10, new Date('2026-11-10T09:45:01Z'))).toBe(true);
  });
});
