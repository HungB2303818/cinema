import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#e6e2c1]/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] border-none';

  const variants = {
    primary: 'bg-[#e6e2c1] hover:bg-[#dad6b2] text-black shadow-md shadow-black/30',
    secondary: 'bg-[#181a24] hover:bg-[#222530] text-white',
    outline: 'bg-[#181a24] hover:bg-[#222530] text-zinc-200',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'hover:bg-white/10 text-zinc-300 hover:text-white',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {children}
    </button>
  );
};
