/**
 * Format currency to Vietnamese Dong (VND)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ISO UTC date string into Vietnam Local Time (Asia/Ho_Chi_Minh)
 * Output example: "14:30 10/11/2026" or "14:30 - 10/11/2026"
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format time only in Vietnam Local Time (HH:mm)
 */
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format date only (YYYY-MM-DD or ISO string to DD/MM/YYYY in Asia/Ho_Chi_Minh)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Chưa xác định';
  try {
    // If it's a date-only string like "2026-11-10", parsing as new Date("2026-11-10") might treat as UTC 00:00
    // To ensure exact date display without UTC-boundary shift:
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Get date string in YYYY-MM-DD according to Asia/Ho_Chi_Minh timezone.
 * NEVER use toISOString().split('T')[0] because that returns UTC date which can differ from Vietnam date!
 */
export function getVietnamDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Checks if a showtime is past the booking cutoff.
 * Cutoff rule: startsAt - 10 minutes (BR-08 / TC-19).
 * If bookingClosesAt is provided by backend (ISO string), that takes precedence.
 */
export function isPastCutoff(
  startsAtIso: string,
  bookingClosesAtIso?: string | null,
  cutoffMinutes = 10,
  now: Date = new Date()
): boolean {
  if (bookingClosesAtIso) {
    const closesAtTime = new Date(bookingClosesAtIso).getTime();
    if (!isNaN(closesAtTime)) {
      return now.getTime() >= closesAtTime;
    }
  }

  const startTime = new Date(startsAtIso).getTime();
  if (isNaN(startTime)) return false;

  const cutoffTime = startTime - cutoffMinutes * 60 * 1000;
  return now.getTime() >= cutoffTime;
}

/**
 * Age rating badge configuration
 */
export function getAgeRatingBadge(rating: string | null | undefined): { label: string; color: string } {
  switch (rating) {
    case 'P':
      return { label: 'P - Phổ biến', color: 'bg-[#799D46] text-white font-bold' };
    case 'K':
      return { label: 'K - Dưới 13 tuổi có bảo hộ', color: 'bg-blue-600 text-white font-semibold' };
    case 'T13':
      return { label: 'T13 - Khán giả 13+', color: 'bg-amber-500 text-black font-bold' };
    case 'T16':
      return { label: 'T16 - Khán giả 16+', color: 'bg-orange-600 text-white font-semibold' };
    case 'T18':
      return { label: 'T18 - Khán giả 18+', color: 'bg-red-600 text-white font-semibold' };
    case 'C':
      return { label: 'C - Cấm phổ biến', color: 'bg-zinc-700 text-white font-semibold' };
    default:
      return { label: rating || 'P - Phổ biến', color: 'bg-zinc-800 text-zinc-300' };
  }
}

/**
 * Movie status badge configuration
 */
export function getMovieStatusBadge(status: string | null | undefined): { label: string; color: string } {
  switch (status) {
    case 'SHOWING':
      return { label: 'Đang chiếu', color: 'bg-[#e6e2c1] text-black font-bold' };
    case 'UPCOMING':
      return { label: 'Sắp chiếu', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold' };
    case 'ENDED':
      return { label: 'Đã kết thúc', color: 'bg-zinc-800 text-zinc-400 font-medium' };
    case 'HIDDEN':
      return { label: 'Đã ẩn', color: 'bg-red-900/30 text-red-400 font-medium' };
    default:
      return { label: status || 'Chưa xác định', color: 'bg-zinc-800 text-zinc-300' };
  }
}

export const formatVietnamDateTime = formatDateTime;

/**
 * Converts a Vietnam local datetime-local input string (YYYY-MM-DDTHH:mm) to UTC ISO string with Z.
 * Explicitly binds to Asia/Ho_Chi_Minh (+07:00) so it does NOT depend on the user's machine timezone.
 */
export function vietnamLocalInputToUtcIso(datetimeLocalStr: string): string {
  if (!datetimeLocalStr) return '';
  // Ensure seconds are present: "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00+07:00"
  const normalized = datetimeLocalStr.length === 16 ? `${datetimeLocalStr}:00` : datetimeLocalStr;
  const withOffset = `${normalized}+07:00`;
  const date = new Date(withOffset);
  if (isNaN(date.getTime())) {
    throw new Error('Định dạng thời gian không hợp lệ.');
  }
  return date.toISOString();
}

/**
 * Converts a UTC ISO string (e.g. from backend) to Vietnam local datetime-local input string (YYYY-MM-DDTHH:mm).
 * Explicitly converts to Asia/Ho_Chi_Minh (+07:00) regardless of the client machine's local timezone.
 */
export function utcIsoToVietnamLocalInput(utcIsoStr: string): string {
  if (!utcIsoStr) return '';
  const date = new Date(utcIsoStr);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  let hour = parts.find((p) => p.type === 'hour')?.value;
  if (hour === '24') hour = '00';
  const minute = parts.find((p) => p.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Adds minutes to a Vietnam datetime-local string (YYYY-MM-DDTHH:mm) and returns new YYYY-MM-DDTHH:mm string.
 */
export function addMinutesToVietnamLocal(datetimeLocalStr: string, minutes: number): string {
  if (!datetimeLocalStr || isNaN(minutes)) return '';
  const utcIso = vietnamLocalInputToUtcIso(datetimeLocalStr);
  const date = new Date(utcIso);
  const newDate = new Date(date.getTime() + minutes * 60 * 1000);
  return utcIsoToVietnamLocalInput(newDate.toISOString());
}
