import { useEffect, useRef } from 'react';
import { formatDate, getVietnamDateString } from '@/shared/utils/format';

interface ShowtimeDateStripProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  today?: string;
}

const DAY_COUNT = 7;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Work with calendar dates in UTC, not the browser's local timezone or DST.
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function ShowtimeDateStrip({ selectedDate, onSelect, today = getVietnamDateString() }: ShowtimeDateStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const start = selectedDate < today || selectedDate >= addDays(today, DAY_COUNT) ? selectedDate : today;
  const dates = Array.from({ length: DAY_COUNT }, (_, index) => addDays(start, index));

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selectedDate]);

  return (
    <div role="group" aria-label="Chọn ngày chiếu" className="flex gap-2 overflow-x-auto rounded-2xl border border-[#242733] bg-[#13151d] p-3 sm:gap-3 sm:p-4">
      {dates.map((date) => {
        const value = new Date(`${date}T00:00:00Z`);
        const selected = date === selectedDate;
        return (
          <button
            key={date}
            ref={selected ? selectedRef : undefined}
            type="button"
            aria-label={`Chọn ngày ${formatDate(date)}`}
            aria-pressed={selected}
            onClick={() => onSelect(date)}
            className={`flex h-[76px] min-w-[104px] flex-1 items-center justify-between gap-2 rounded-xl border px-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6e2c1] ${selected ? 'border-[#e6e2c1] bg-[#e6e2c1] text-[#090a0f] shadow-sm' : 'border-[#242733] bg-[#090a0f] text-zinc-400 hover:border-[#e6e2c1]/50 hover:bg-[#1a1c26] hover:text-[#e6e2c1]'}`}
          >
            <span className="flex flex-col items-start text-base leading-6">
              <span>{value.getUTCMonth() + 1}</span>
              <span>{WEEKDAYS[value.getUTCDay()]}</span>
            </span>
            <span className="text-[50px] font-normal leading-none tabular-nums">{String(value.getUTCDate()).padStart(2, '0')}</span>
          </button>
        );
      })}
    </div>
  );
}
