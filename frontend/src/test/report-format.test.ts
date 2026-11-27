import { describe, it, expect } from 'vitest';
import {
  formatChartPeriod,
  formatCompactMoney,
  formatCount,
  formatMoneyString,
  formatPeriod,
  isZeroMoney,
} from '@/features/reports';

describe('report formatting', () => {
  it('formats decimal strings without losing large digits', () => {
    expect(formatMoneyString('240000.00')).toBe('240.000 ₫');
    expect(formatMoneyString('9999999999.99')).toBe('9.999.999.999,99 ₫');
    expect(formatMoneyString('123.40')).toBe('123,4 ₫');
    expect(formatMoneyString('123.45')).toBe('123,45 ₫');
    expect(formatMoneyString('0.00')).toBe('0 ₫');
    expect(formatMoneyString('-5000.00')).toBe('-5.000 ₫');
  });

  it('keeps non-numeric values untouched and treats empty as zero', () => {
    expect(formatMoneyString(null)).toBe('0 ₫');
    expect(formatMoneyString(undefined)).toBe('0 ₫');
    expect(formatMoneyString('')).toBe('0 ₫');
    expect(formatMoneyString('N/A')).toBe('N/A');
  });

  it('formats counts with Vietnamese grouping', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(12345)).toBe('12.345');
  });

  it('formats day and month periods', () => {
    expect(formatPeriod('2026-11-01', 'DAY')).toBe('01/11/2026');
    expect(formatPeriod('2026-11', 'MONTH')).toBe('Tháng 11/2026');
    expect(formatPeriod('invalid', 'MONTH')).toBe('invalid');
  });

  it('formats compact chart labels', () => {
    expect(formatChartPeriod('2026-11-01', 'DAY')).toBe('01/11');
    expect(formatChartPeriod('2026-11', 'MONTH')).toBe('T11/26');
    expect(formatChartPeriod('invalid', 'DAY')).toBe('invalid');
  });

  it('formats compact money for chart ticks', () => {
    expect(formatCompactMoney(0)).toBe('0');
    expect(formatCompactMoney(999)).toBe('999');
    expect(formatCompactMoney(1500)).toBe('2 ng');
    expect(formatCompactMoney(1_500_000)).toBe('1,5 tr');
    expect(formatCompactMoney(2_000_000_000)).toBe('2,0 tỷ');
  });

  it('detects zero money strings', () => {
    expect(isZeroMoney('0.00')).toBe(true);
    expect(isZeroMoney('000.000')).toBe(true);
    expect(isZeroMoney('0.01')).toBe(false);
    expect(isZeroMoney('100.00')).toBe(false);
  });
});
