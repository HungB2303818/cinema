import type { SeatItem } from '@/features/showtimes';

/**
 * Natural sorting for seat labels (e.g., A1, A2, A9, A10, B1).
 * Uses localeCompare with numeric: true so A2 comes before A10.
 */
export function sortSeatsNaturally(seats: SeatItem[]): SeatItem[] {
  return [...seats].sort((a, b) =>
    a.label.localeCompare(b.label, 'vi-VN', { numeric: true, sensitivity: 'base' })
  );
}

export interface SeatRowGroup {
  rowLabel: string;
  seats: SeatItem[];
}

/**
 * Groups seats by their row label extracted from the seat label.
 * E.g., 'A1', 'A2' -> row 'A'; 'B1' -> row 'B'.
 * If a label doesn't start with letters, it groups under 'Khác' or general list.
 */
export function groupSeatsByRow(seats: SeatItem[]): SeatRowGroup[] {
  const sorted = sortSeatsNaturally(seats);
  const groupsMap = new Map<string, SeatItem[]>();

  for (const seat of sorted) {
    const match = seat.label.match(/^([A-Za-z]+)/);
    const rowLabel = match ? match[1].toUpperCase() : 'Khác';

    const list = groupsMap.get(rowLabel);
    if (list) {
      list.push(seat);
    } else {
      groupsMap.set(rowLabel, [seat]);
    }
  }

  const result: SeatRowGroup[] = [];
  for (const [rowLabel, rowSeats] of groupsMap.entries()) {
    result.push({
      rowLabel,
      seats: rowSeats,
    });
  }

  return result;
}
