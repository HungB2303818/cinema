import React from 'react';

interface MovieHeroBannerProps {
  onExploreClick?: () => void;
  className?: string;
}

export const MovieHeroBanner: React.FC<MovieHeroBannerProps> = ({
  className = '',
}) => {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-[#262934] shadow-2xl min-h-[440px] sm:min-h-[500px] md:min-h-[560px] flex flex-col justify-end ${className}`}
      aria-label="Banner Dune: Hành Tinh Cát - Phần Ba"
    >
      {/* Full-width Panoramic Image covering the entire horizontal width */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src="/banners/dune_fullwidth_seamless.jpg"
          alt="Paul Atreides và Chani - Dune: Hành Tinh Cát - Phần Ba"
          fetchPriority="high"
          width={1920}
          height={740}
          className="w-full h-full object-cover object-[center_35%] sm:object-[center_40%]"
        />

        {/* Soft Transparency Gradient rising from the bottom up (Mờ mờ từ dưới lên) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, #090a0f 0%, rgba(9, 10, 15, 0.95) 20%, rgba(9, 10, 15, 0.7) 40%, rgba(9, 10, 15, 0.25) 60%, transparent 80%)',
          }}
        />

        {/* Subtle Top Vignette */}
        <div
          className="absolute inset-x-0 top-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(9, 10, 15, 0.5) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Text Content situated at the BOTTOM with bottom-up transparency */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-8 sm:pb-10 md:pb-12 text-center space-y-3">
        {/* Main Title: Minimalist, Crisp White & Sand Gold */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
          DUNE: HÀNH TINH CÁT – <span className="text-[#e6e2c1]">PHẦN BA</span>
        </h1>

        {/* Concise Slogan / Synopsis */}
        <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed font-normal max-w-2xl mx-auto drop-shadow-sm">
          Paul Atreides hợp lực cùng Chani và tộc người Fremen trước ngã rẽ giữa tình yêu và số phận vũ trụ, chàng buộc phải ngăn chặn một tương lai tăm tối mà chỉ mình nhìn thấy.
        </p>
      </div>
    </section>
  );
};
