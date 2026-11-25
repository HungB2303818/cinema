import type { SeatState } from '@/features/showtimes';
import type { PhysicalSeatStatus } from '@/features/cinemas';

export const SEAT_SURFACE_STYLES = {
  standard:
    'bg-[#cfc1f0] border-[#b7a3e6] text-[#4c1d95] hover:bg-[#c1afea] hover:border-[#9f86dc]',
  standardStatic: 'bg-[#cfc1f0] border-[#b7a3e6] text-[#4c1d95]',
  vip: 'bg-[#e8b3ad] border-[#d6958e] text-[#7f1d1d] hover:bg-[#dfa099] hover:border-[#c97e76]',
  vipStatic: 'bg-[#e8b3ad] border-[#d6958e] text-[#7f1d1d]',
  selected:
    'bg-[#db2777] border-[#db2777] text-white font-bold shadow-md shadow-[#db2777]/30 scale-105',
  selectedStatic: 'bg-[#db2777] border-[#db2777] text-white',
  held: 'bg-amber-950/40 border-amber-700/60 text-amber-300 cursor-not-allowed',
  booked: 'bg-[#1d202b] border-[#2c3040] text-zinc-500 cursor-not-allowed opacity-70',
  maintenance:
    'bg-[#1d202b] border-dashed border-rose-500/70 text-rose-300 hover:border-rose-400 hover:bg-[#252836]',
} as const;

export type SeatVisualState = SeatState | PhysicalSeatStatus | 'SELECTED';
