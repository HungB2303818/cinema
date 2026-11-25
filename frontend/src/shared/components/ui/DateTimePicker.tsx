import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { utcIsoToVietnamLocalInput } from '@/shared/utils/format';

export interface DateTimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDateTime?: string;
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const parseValue = (value: string): Parts | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
};

const nowInVietnam = (): Parts | null =>
  parseValue(utcIsoToVietnamLocalInput(new Date().toISOString()));

const toValue = (parts: Parts) =>
  `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;

const compareParts = (a: Parts, b: Parts) => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  if (a.day !== b.day) return a.day - b.day;
  if (a.hour !== b.hour) return a.hour - b.hour;
  return a.minute - b.minute;
};

const isBeforeMin = (candidate: Parts, min: Parts | null) =>
  Boolean(min && compareParts(candidate, min) < 0);

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const buildDays = (year: number, month: number) => {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month - 1, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start + i * 86_400_000);
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  });
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  id,
  value,
  onChange,
  error = false,
  disabled = false,
  placeholder = 'Chọn ngày giờ',
  minDateTime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [view, setView] = useState(() => {
    const current = parseValue(value) ?? nowInVietnam();
    return { year: current?.year ?? 2026, month: current?.month ?? 1 };
  });

  const selected = parseValue(value);
  const today = nowInVietnam();
  const min = parseValue(minDateTime ?? '');
  const current = selected ?? min ?? today;
  const days = useMemo(() => buildDays(view.year, view.month), [view]);
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, i) => view.year - 5 + i),
    [view.year]
  );

  const close = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const clampToMin = (parts: Parts) => {
    if (!min) return parts;
    return compareParts(parts, min) < 0 ? min : parts;
  };

  const openPicker = () => {
    if (disabled) return;
    const anchor = parseValue(value) ?? min ?? nowInVietnam();
    if (anchor) setView({ year: anchor.year, month: anchor.month });
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPlacement(spaceBelow < 420 && spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
    setIsOpen(true);
  };

  const selectDay = (day: { year: number; month: number; day: number }) => {
    const time = current ?? min ?? { hour: 9, minute: 0, year: day.year, month: day.month, day: day.day };
    const next = clampToMin({
      year: day.year,
      month: day.month,
      day: day.day,
      hour: time.hour,
      minute: time.minute,
    });
    onChange(toValue(next));
    setView({ year: day.year, month: day.month });
  };

  const selectHour = (hour: number) => {
    if (!current) return;
    const next = clampToMin({ ...current, hour });
    onChange(toValue(next));
  };

  const selectMinute = (minute: number) => {
    if (!current) return;
    const next = clampToMin({ ...current, minute });
    onChange(toValue(next));
  };

  const selectNow = () => {
    const now = nowInVietnam();
    if (!now) return;
    const next = clampToMin(now);
    onChange(toValue(next));
    setView({ year: next.year, month: next.month });
  };

  const isDayDisabled = (day: { year: number; month: number; day: number }) => {
    if (!min) return false;
    const dayEnd: Parts = { ...day, hour: 23, minute: 59 };
    return compareParts(dayEnd, min) < 0;
  };

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  };

  const timeColumnClass =
    'max-h-[252px] overflow-y-auto rounded-lg border border-[#242733] bg-[#0f1117] p-1';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => (isOpen ? close() : openPicker())}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={error || undefined}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 bg-[#13151c] border rounded-xl text-sm text-left transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          error
            ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/40'
            : 'border-[#262934] focus:border-[#e6e2c1] focus:ring-2 focus:ring-[#e6e2c1]/40'
        }`}
      >
        <span className={selected ? 'text-zinc-100' : 'text-zinc-500'}>
          {selected
            ? `${pad2(selected.day)}/${pad2(selected.month)}/${selected.year} ${pad2(selected.hour)}:${pad2(selected.minute)}`
            : placeholder}
        </span>
        <Calendar className="w-4 h-4 shrink-0 text-zinc-400" />
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Chọn ngày giờ"
          tabIndex={-1}
          className={`absolute left-0 z-50 w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#242733] bg-[#12141c] p-4 shadow-2xl shadow-black/60 focus:outline-none ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-[272px] sm:shrink-0">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Tháng trước"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1d202b] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Tháng"
                    value={view.month}
                    onChange={(e) => setView((prev) => ({ ...prev, month: Number(e.target.value) }))}
                    className="px-2 py-1 bg-[#0f1117] border border-[#262934] rounded-lg text-xs font-semibold text-zinc-200 focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
                  >
                    {MONTHS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Năm"
                    value={view.year}
                    onChange={(e) => setView((prev) => ({ ...prev, year: Number(e.target.value) }))}
                    className="px-2 py-1 bg-[#0f1117] border border-[#262934] rounded-lg text-xs font-semibold text-zinc-200 focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Tháng sau"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1d202b] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {WEEKDAYS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isSelected =
                    selected?.year === day.year &&
                    selected?.month === day.month &&
                    selected?.day === day.day;
                  const isToday =
                    today?.year === day.year &&
                    today?.month === day.month &&
                    today?.day === day.day;
                  const isCurrentMonth = day.month === view.month;
                  const dayDisabled = isDayDisabled(day);

                  let dayClass = 'text-zinc-600 hover:bg-[#1d202b]';
                  if (dayDisabled) {
                    dayClass = 'text-zinc-700 cursor-not-allowed opacity-40';
                  } else if (isSelected) {
                    dayClass = 'bg-[#e6e2c1] text-black font-bold';
                  } else if (isToday) {
                    dayClass = 'text-[#e6e2c1] ring-1 ring-[#e6e2c1]/50 hover:bg-[#1d202b]';
                  } else if (isCurrentMonth) {
                    dayClass = 'text-zinc-200 hover:bg-[#1d202b]';
                  }

                  return (
                    <button
                      key={`${day.year}-${day.month}-${day.day}`}
                      type="button"
                      disabled={dayDisabled}
                      onClick={() => selectDay(day)}
                      aria-label={`Ngày ${day.day} tháng ${day.month} năm ${day.year}`}
                      aria-pressed={Boolean(isSelected)}
                      className={`h-8 rounded-lg text-xs font-semibold transition-colors ${dayDisabled ? '' : 'cursor-pointer'} ${dayClass}`}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full border-t border-[#20232e] pt-3 sm:w-[148px] sm:shrink-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>Giờ chiếu</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className={timeColumnClass}>
                  {HOURS.map((hour) => {
                    const hourDisabled = current ? isBeforeMin({ ...current, hour, minute: 59 }, min) : false;
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={hourDisabled}
                        onClick={() => selectHour(hour)}
                        aria-label={`Giờ ${pad2(hour)}`}
                        aria-pressed={selected?.hour === hour}
                        className={`w-full rounded-md px-1 py-1 text-xs font-semibold text-center transition-colors ${
                          hourDisabled
                            ? 'text-zinc-700 cursor-not-allowed opacity-40'
                            : selected?.hour === hour
                              ? 'bg-[#e6e2c1] text-black cursor-pointer'
                              : 'text-zinc-300 hover:bg-[#1d202b] cursor-pointer'
                        }`}
                      >
                        {pad2(hour)}
                      </button>
                    );
                  })}
                </div>

                <div className={timeColumnClass}>
                  {MINUTES.map((minute) => {
                    const minuteDisabled = current ? isBeforeMin({ ...current, minute }, min) : false;
                    return (
                      <button
                        key={minute}
                        type="button"
                        disabled={minuteDisabled}
                        onClick={() => selectMinute(minute)}
                        aria-label={`Phút ${pad2(minute)}`}
                        aria-pressed={selected?.minute === minute}
                        className={`w-full rounded-md px-1 py-1 text-xs font-semibold text-center transition-colors ${
                          minuteDisabled
                            ? 'text-zinc-700 cursor-not-allowed opacity-40'
                            : selected?.minute === minute
                              ? 'bg-[#e6e2c1] text-black cursor-pointer'
                              : 'text-zinc-300 hover:bg-[#1d202b] cursor-pointer'
                        }`}
                      >
                        {pad2(minute)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#20232e] pt-3">
            <button
              type="button"
              onClick={selectNow}
              className="text-xs font-semibold text-[#e6e2c1] hover:underline cursor-pointer"
            >
              Bây giờ
            </button>
            <button
              type="button"
              onClick={() => close()}
              className="px-3.5 py-1.5 rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black text-xs font-bold transition-colors cursor-pointer"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
