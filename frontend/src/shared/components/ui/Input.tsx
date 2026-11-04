import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all ${
            error
              ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400'
              : 'border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
