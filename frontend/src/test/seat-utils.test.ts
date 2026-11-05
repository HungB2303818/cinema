import { describe, it, expect } from 'vitest';
import { sortSeatsNaturally, groupSeatsByRow } from '@/features/bookings/utils/seat-utils';
import type { SeatItem } from '@/features/showtimes';

describe('seat-utils', () => {
  const mockSeats: SeatItem[] = [
    { seatId: 10, label: 'A10', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
    { seatId: 2, label: 'A2', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
    { seatId: 1, label: 'A1', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
    { seatId: 20, label: 'B2', seatType: 'VIP', status: 'AVAILABLE', price: 105000 },
    { seatId: 11, label: 'B1', seatType: 'VIP', status: 'AVAILABLE', price: 105000 },
    { seatId: 99, label: 'A9', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
  ];

  it('natural sorts seat labels so A2 comes before A10 and A9 before A10', () => {
    const sorted = sortSeatsNaturally(mockSeats);
    const labels = sorted.map((s) => s.label);
    expect(labels).toEqual(['A1', 'A2', 'A9', 'A10', 'B1', 'B2']);
  });

  it('groups seats by row label naturally', () => {
    const groups = groupSeatsByRow(mockSeats);
    expect(groups).toHaveLength(2);

    expect(groups[0].rowLabel).toBe('A');
    expect(groups[0].seats.map((s) => s.label)).toEqual(['A1', 'A2', 'A9', 'A10']);

    expect(groups[1].rowLabel).toBe('B');
    expect(groups[1].seats.map((s) => s.label)).toEqual(['B1', 'B2']);
  });

  it('handles irregular seat labels gracefully under fallback row label', () => {
    const irregularSeats: SeatItem[] = [
      { seatId: 1, label: '101', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
      { seatId: 2, label: '102', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
    ];
    const groups = groupSeatsByRow(irregularSeats);
    expect(groups).toHaveLength(1);
    expect(groups[0].rowLabel).toBe('Khác');
    expect(groups[0].seats.map((s) => s.label)).toEqual(['101', '102']);
  });
});
