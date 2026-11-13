import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MovieHeroBannerProps {
  className?: string;
}

const slides = [
  {
    name: 'Dune: Hành Tinh Cát - Phần Ba',
    image: '/banners/dune_banner_2.webp',
    alt: 'Paul Atreides và Chani - Dune: Hành Tinh Cát - Phần Ba',
    title: 'DUNE: HÀNH TINH CÁT –',
    highlight: 'PHẦN BA',
    description: 'Paul Atreides hợp lực cùng Chani và tộc người Fremen trước ngã rẽ giữa tình yêu và số phận vũ trụ, chàng buộc phải ngăn chặn một tương lai tăm tối mà chỉ mình nhìn thấy.',
    imageClass: 'object-[center_35%] sm:object-[center_40%]',
    accent: '#e6e2c1',
  },
  {
    name: 'Avengers: Doomsday',
    image: '/banners/avengers_banner.webp',
    alt: 'Doctor Doom khoác áo choàng đứng giữa đại sảnh',
    title: 'AVENGERS:',
    highlight: 'DOOMSDAY',
    description: 'Những anh hùng của nhiều thế giới phải hợp sức khi Doctor Doom xuất hiện và đe doạ vận mệnh đa vũ trụ.',
    imageClass: 'object-center',
    accent: '#e9c793',
  },
  {
    name: 'Godzilla Minus Zero',
    image: '/banners/godzilla_banner.webp',
    alt: 'Godzilla trồi lên từ biển trước một chiếc máy bay',
    title: 'GODZILLA',
    highlight: 'MINUS ZERO',
    description: 'Godzilla trở lại, gieo rắc nỗi kinh hoàng khi Nhật Bản vừa gượng dậy sau thảm hoạ.',
    imageClass: 'object-center',
    accent: '#a9dbdc',
  },
] as const;

export const MovieHeroBanner: React.FC<MovieHeroBannerProps> = ({
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');

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
    if (paused || reducedMotion || !pageVisible) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, pageVisible, activeIndex]);

  const goTo = (index: number) => setActiveIndex((index + slides.length) % slides.length);
  const activeSlide = slides[activeIndex];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-[#262934] shadow-2xl min-h-[440px] sm:min-h-[500px] md:min-h-[560px] flex flex-col justify-end bg-[#090a0f] ${className}`}
      aria-label={`Banner ${activeSlide.name}`}
      aria-roledescription="trình chiếu banner phim"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.name}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${index === activeIndex ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={index !== activeIndex}
        >
          <img
            src={slide.image}
            alt={index === activeIndex ? slide.alt : ''}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 ? 'eager' : 'lazy'}
            width={index === 0 ? 1920 : index === 1 ? 1680 : 600}
            height={index === 0 ? 7 : index === 1 ? 800 : 401}
            className={`w-full h-full object-cover ${slide.imageClass}`}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #090a0f 0%, rgba(9, 10, 15, 0.95) 20%, rgba(9, 10, 15, 0.7) 40%, rgba(9, 10, 15, 0.25) 60%, transparent 80%)' }}
          />
          <div className="absolute inset-x-0 top-0 h-20 pointer-events-none bg-gradient-to-b from-[#090a0f]/50 to-transparent" />
        </div>
      ))}

      <div key={activeIndex} className="movie-hero-caption relative z-10 w-full max-w-4xl mx-auto px-12 sm:px-16 pb-20 sm:pb-16 text-center space-y-3" aria-live="off">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md">
          {activeSlide.title} <span style={{ color: activeSlide.accent }}>{activeSlide.highlight}</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed font-normal max-w-2xl mx-auto drop-shadow-sm">
          {activeSlide.description}
        </p>
      </div>

      <div className="absolute z-20 right-4 top-4 sm:inset-x-5 sm:top-1/2 sm:-translate-y-1/2 flex gap-2 sm:justify-between pointer-events-none">
        <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Banner trước" className="pointer-events-auto flex size-10 sm:size-11 items-center justify-center rounded-full bg-[#090a0f]/65 text-white border border-white/25 hover:bg-[#090a0f]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6e2c1] cursor-pointer">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Banner tiếp theo" className="pointer-events-auto flex size-10 sm:size-11 items-center justify-center rounded-full bg-[#090a0f]/65 text-white border border-white/25 hover:bg-[#090a0f]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6e2c1] cursor-pointer">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="absolute z-20 inset-x-0 bottom-4 flex justify-center gap-2" aria-label="Chọn banner phim">
        {slides.map((slide, index) => (
          <button
            key={slide.name}
            type="button"
            aria-label={`Xem banner ${slide.name}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => goTo(index)}
            className={`h-2.5 rounded-full border-none cursor-pointer transition-[width,background-color] duration-300 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e6e2c1] ${index === activeIndex ? 'w-8 bg-[#e6e2c1]' : 'w-2.5 bg-white/50 hover:bg-white'}`}
          />
        ))}
      </div>
    </section>
  );
};
