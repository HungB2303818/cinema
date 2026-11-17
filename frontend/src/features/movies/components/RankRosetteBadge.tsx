import React from 'react';

interface RankRosetteBadgeProps {
  rank: number;
  className?: string;
}

interface RankTheme {
  primary: string;     // Rosette background and right tail
  secondary: string;   // Left tail shadow/fold
  stroke: string;      // Outline
  label: string;
}

const RANK_THEMES: Record<number, RankTheme> = {
  1: {
    primary: '#EE1B24',   // Red
    secondary: '#B9121A', // Darker Red for shadow/fold
    stroke: '#990E15',
    label: 'Top 1',
  },
  2: {
    primary: '#F58220',   // Orange
    secondary: '#C65F0A', // Darker Orange
    stroke: '#A24B02',
    label: 'Top 2',
  },
  3: {
    primary: '#0072CE',   // Blue
    secondary: '#005299', // Darker Blue
    stroke: '#003F75',
    label: 'Top 3',
  },
};

const DEFAULT_THEME: RankTheme = {
  primary: '#EAB308',   // Gold
  secondary: '#CA8A04',
  stroke: '#A16207',
  label: 'Top Hot',
};

// 24-point smooth scalloped rosette path (cx=23, cy=20, R=17, r=15.6)
const SCALLOP_PATH =
  'M 40.0,20.0 L 38.47,22.04 L 39.42,24.4 L 37.41,25.97 L 37.72,28.5 L 35.38,29.5 L 35.02,32.02 L 32.5,32.38 L 31.5,34.72 L 28.97,34.41 L 27.4,36.42 L 25.04,35.47 L 23.0,37.0 L 20.96,35.47 L 18.6,36.42 L 17.03,34.41 L 14.5,34.72 L 13.5,32.38 L 10.98,32.02 L 10.62,29.5 L 8.28,28.5 L 8.59,25.97 L 6.58,24.4 L 7.53,22.04 L 6.0,20.0 L 7.53,17.96 L 6.58,15.6 L 8.59,14.03 L 8.28,11.5 L 10.62,10.5 L 10.98,7.98 L 13.5,7.62 L 14.5,5.28 L 17.03,5.59 L 18.6,3.58 L 20.96,4.53 L 23.0,3.0 L 25.04,4.53 L 27.4,3.58 L 28.97,5.59 L 31.5,5.28 L 32.5,7.62 L 35.02,7.98 L 35.38,10.5 L 37.72,11.5 L 37.41,14.03 L 39.42,15.6 L 38.47,17.96 Z';

export const RankRosetteBadge: React.FC<RankRosetteBadgeProps> = ({
  rank,
  className = '',
}) => {
  const theme = RANK_THEMES[rank] || DEFAULT_THEME;

  return (
    <div
      className={`inline-block pointer-events-none select-none drop-shadow-lg transition-transform duration-300 group-hover:scale-110 ${className}`}
      title={theme.label}
      aria-label={`Xếp hạng ${rank}`}
    >
      <svg
        viewBox="0 0 46 56"
        className="w-10 h-[49px] sm:w-11 sm:h-[54px] md:w-12 md:h-[58px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          {/* Left Ribbon Tail (with V-notch cut) */}
          <path
            d="M 19,28 L 12,53 L 17,46 L 22,51 L 22,33 Z"
            fill={theme.secondary}
          />
          {/* Right Ribbon Tail (with V-notch cut) */}
          <path
            d="M 27,28 L 34,53 L 29,46 L 24,51 L 24,33 Z"
            fill={theme.primary}
          />

          {/* Rosette Body (Scalloped flower border) */}
          <path
            d={SCALLOP_PATH}
            fill={theme.primary}
            stroke={theme.stroke}
            strokeWidth="0.5"
          />

          {/* White dashed inner circle */}
          <circle
            cx="23"
            cy="20"
            r="12.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeDasharray="2.2 1.3"
            opacity="0.95"
          />

          {/* Center Rank Number */}
          <text
            x="23"
            y="20.5"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="18"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {rank}
          </text>
        </g>
      </svg>
    </div>
  );
};
