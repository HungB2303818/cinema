import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertMessageProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: React.ReactNode; text: string }> = {
  success: {
    container: 'bg-[#e6e2c1]/10 border-[#e6e2c1]/30 text-zinc-100',
    icon: <CheckCircle2 className="w-5 h-5 text-[#e6e2c1] shrink-0" />,
    text: 'text-[#e6e2c1]',
  },
  error: {
    container: 'bg-red-950/30 border-red-800/40 text-red-200',
    icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    text: 'text-red-300 font-bold',
  },
  warning: {
    container: 'bg-amber-950/30 border-amber-800/40 text-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    text: 'text-amber-300 font-bold',
  },
  info: {
    container: 'bg-sky-950/30 border-sky-800/40 text-sky-200',
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    text: 'text-sky-300 font-bold',
  },
};

export const AlertMessage: React.FC<AlertMessageProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const style = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 p-4 rounded-2xl border text-sm transition-all ${style.container} ${className}`}
    >
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1 space-y-0.5">
        {title && <h5 className={`font-bold ${style.text}`}>{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="p-1 rounded-full border-none text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
