import type { SelectHTMLAttributes } from 'react';

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 border border-line bg-surface rounded-md px-3 text-sm text-ink outline-hidden focus:border-accent focus:ring-4 focus:ring-accent-soft ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
