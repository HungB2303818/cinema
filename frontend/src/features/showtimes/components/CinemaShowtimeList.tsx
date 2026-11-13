import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import type { Showtime } from '../types/showtime.types';
import type { Cinema } from '@/features/cinemas/types/cinema.types';
import { formatCurrency, formatTime, isPastCutoff } from '@/shared/utils/format';

interface CinemaShowtimeListProps {
  showtimes: Showtime[];
  cinemas?: Cinema[];
  movieTitle?: string;
  now: Date;
}

interface RoomShowtimeGroup {
  roomName: string;
  firstStart: number;
  showtimes: Showtime[];
}

interface CinemaShowtimeGroup {
  cinemaId: number;
  cinemaName: string;
  address?: string;
  firstStart: number;
  rooms: RoomShowtimeGroup[];
}

function startTime(showtime: Showtime): number {
  const value = new Date(showtime.startsAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function groupByCinema(showtimes: Showtime[], cinemas: Cinema[]): CinemaShowtimeGroup[] {
  const addressByCinemaId = new Map(cinemas.map((cinema) => [cinema.id, cinema.address]));
  const byCinema = new Map<number, { cinemaId: number; cinemaName: string; rooms: Map<string, Showtime[]> }>();

  for (const showtime of showtimes) {
    let cinema = byCinema.get(showtime.cinemaId);
    if (!cinema) {
      cinema = { cinemaId: showtime.cinemaId, cinemaName: showtime.cinemaName, rooms: new Map() };
      byCinema.set(showtime.cinemaId, cinema);
    }
    const room = cinema.rooms.get(showtime.roomName) ?? [];
    room.push(showtime);
    cinema.rooms.set(showtime.roomName, room);
  }

  return [...byCinema.values()]
    .map((cinema) => {
      const rooms = [...cinema.rooms.entries()]
        .map(([roomName, roomShowtimes]) => {
          const sorted = [...roomShowtimes].sort((a, b) => startTime(a) - startTime(b));
          return { roomName, firstStart: startTime(sorted[0]), showtimes: sorted };
        })
        .sort((a, b) => a.firstStart - b.firstStart || a.roomName.localeCompare(b.roomName, 'vi'));

      return {
        cinemaId: cinema.cinemaId,
        cinemaName: cinema.cinemaName,
        address: addressByCinemaId.get(cinema.cinemaId),
        firstStart: rooms[0]?.firstStart ?? 0,
        rooms,
      };
    })
    .sort((a, b) => a.firstStart - b.firstStart || a.cinemaName.localeCompare(b.cinemaName, 'vi'));
}

interface ShowtimeChipProps {
  showtime: Showtime;
  movieTitle?: string;
  now: Date;
}

const ShowtimeChip: React.FC<ShowtimeChipProps> = ({ showtime, movieTitle, now }) => {
  const time = formatTime(showtime.startsAt);
  const isScheduled = showtime.status === 'SCHEDULED';
  const isCutoff = isPastCutoff(showtime.startsAt, null, 10, now);
  const canBook = isScheduled && !isCutoff;

  const detail = `${time} - ${showtime.roomName} - ${formatCurrency(showtime.basePrice)}`;

  if (!canBook) {
    return (
      <button
        type="button"
        disabled
        title={
          !isScheduled
            ? `Suất chiếu đã hủy hoặc tạm dừng (${detail})`
            : `Đã quá thời gian đặt vé trước giờ chiếu 10 phút (${detail})`
        }
        aria-label={`${time}, ${showtime.roomName} - không khả dụng`}
        className="inline-flex min-w-[78px] cursor-not-allowed items-center justify-center rounded-lg border border-[#1e202a] bg-[#101117] px-3 py-2 text-sm font-bold text-zinc-500 line-through"
      >
        {time}
      </button>
    );
  }

  return (
    <Link
      to={`/showtimes/${showtime.id}/seats`}
      state={{
        movieTitle,
        cinemaName: showtime.cinemaName,
        roomName: showtime.roomName,
        startsAt: showtime.startsAt,
      }}
      title={detail}
      aria-label={`Đặt vé suất ${time}, ${showtime.cinemaName}, ${showtime.roomName}`}
      className="inline-flex min-w-[78px] items-center justify-center rounded-lg border border-[#2e3242] bg-[#181a24] px-3 py-2 text-sm font-bold text-white transition-colors hover:border-[#e6e2c1] hover:bg-[#e6e2c1] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6e2c1]"
    >
      {time}
    </Link>
  );
};

export const CinemaShowtimeList: React.FC<CinemaShowtimeListProps> = ({
  showtimes,
  cinemas = [],
  movieTitle,
  now,
}) => {
  const groups = useMemo(() => groupByCinema(showtimes, cinemas), [showtimes, cinemas]);

  if (groups.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#242733] bg-[#13151d] shadow-xl">
      {groups.map((group, index) => (
        <section
          key={group.cinemaId}
          aria-label={group.cinemaName}
          className={index > 0 ? 'border-t border-[#20232e]' : undefined}
        >
          <div className="space-y-4 p-5 sm:p-6">
            <header className="space-y-1.5">
              <h3 className="flex items-center gap-2 text-base font-black text-white sm:text-lg">
                <Building2 className="h-4 w-4 shrink-0 text-[#e6e2c1]" aria-hidden="true" />
                <span>{group.cinemaName}</span>
              </h3>
              {group.address && (
                <p className="flex items-start gap-1.5 text-xs text-zinc-400">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{group.address}</span>
                </p>
              )}
            </header>

            <div className="space-y-3">
              {group.rooms.map((room) => (
                <div key={room.roomName} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#e6e2c1] sm:w-32 sm:pt-2.5">
                    {room.roomName}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {room.showtimes.map((showtime) => (
                      <ShowtimeChip
                        key={showtime.id}
                        showtime={showtime}
                        movieTitle={movieTitle}
                        now={now}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
