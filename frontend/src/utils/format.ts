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
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format date only (YYYY-MM-DD to DD/MM/YYYY)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Chưa xác định';
  try {
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
 * Age rating badge configuration
 */
export function getAgeRatingBadge(rating: string | null | undefined): { label: string; color: string } {
  switch (rating) {
    case 'P':
      return { label: 'P - Phổ biến', color: 'bg-[#e6e2c1] text-black font-bold' };
    case 'K':
      return { label: 'K - Dưới 13 tuổi có bảo hộ', color: 'bg-blue-600 text-white font-semibold' };
    case 'T13':
      return { label: 'T13 - Khán giả 13+', color: 'bg-amber-500 text-black font-bold' };
    case 'T16':
      return { label: 'T16 - Khán giả 16+', color: 'bg-orange-600 text-white font-semibold' };
    case 'T18':
      return { label: 'T18 - Khán giả 18+', color: 'bg-red-600 text-white font-semibold' };
    default:
      return { label: rating || 'P', color: 'bg-zinc-800 text-zinc-300' };
  }
}
