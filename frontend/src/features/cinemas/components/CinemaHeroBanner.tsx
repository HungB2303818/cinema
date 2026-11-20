import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Cinema } from '../types/cinema.types';
import { getCinemaImage } from '../utils/cinema-image';

const FEATURED_CINEMAS = ['Sense City', 'Xuân Khánh', 'Hùng Vương'];

interface CinemaHeroBannerProps {
  cinemas: Cinema[];
}

export function CinemaHeroBanner({ cinemas }: CinemaHeroBannerProps) {
  const slides = useMemo(() => FEATURED_CINEMAS.flatMap((match) => {
    const cinema = cinemas.find((item) => item.name.toLowerCase().includes(match.toLowerCase()));
    if (!cinema) return [];
    const image = getCinemaImage(cinema);
    return image.imageUrl ? [{ cinema, imageUrl: image.imageUrl }] : [];
  }), [cinemas]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');
  const index = slides.length ? activeIndex % slides.length : 0;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media?.matches ?? false);
    const updateVisibility = () => setPageVisible(document.visibilityState !== 'hidden');
    media?.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media?.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || hovered || focused || reducedMotion || !pageVisible) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length, hovered, focused, reducedMotion, pageVisible, activeIndex]);

  if (!slides.length) return null;

  const goTo = (next: number) => setActiveIndex((next + slides.length) % slides.length);
  const controlClass = 'absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary cursor-pointer';

  return (
    <section
      aria-label="Khám phá không gian các rạp phim"
      aria-roledescription="trình chiếu"
      aria-description="Ảnh tự chuyển sau 6 giây. Di chuột hoặc đặt tiêu điểm để tạm dừng; dùng phím mũi tên trái, phải để chuyển ảnh."
      tabIndex={0}
      className="relative isolate overflow-hidden rounded-3xl border border-cinema-border bg-cinema-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          goTo(index + (event.key === 'ArrowLeft' ? -1 : 1));
        }
      }}
    >
      <div className="relative aspect-video sm:aspect-[980/415]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.cinema.id}
            aria-hidden={slideIndex !== index}
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${slideIndex === index ? 'opacity-100' : 'opacity-0'}`}
          >
            {failedImages.includes(slide.imageUrl) ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
                <Building2 className="size-12" aria-hidden="true" />
                <p>Không tải được hình ảnh rạp</p>
              </div>
            ) : (
              <img
                src={slide.imageUrl}
                alt={`Không gian ${slide.cinema.name}`}
                width={980}
                height={415}
                fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                onError={() => setFailedImages((current) => [...current, slide.imageUrl])}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-5 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-7" aria-live={focused || reducedMotion ? 'polite' : 'off'} aria-atomic="true">
          <h2 className="text-lg font-semibold leading-snug text-white sm:text-2xl">
            {slides[index]!.cinema.name}
          </h2>
        </div>
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Rạp trước" className={`${controlClass} left-3 sm:left-5`}>
              <ChevronLeft className="size-5 sm:size-6" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Rạp tiếp theo" className={`${controlClass} right-3 sm:right-5`}>
              <ChevronRight className="size-5 sm:size-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
