import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow duration-150 ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
