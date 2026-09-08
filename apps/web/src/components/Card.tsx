import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-teal-200 ${className}`}
    >
      {title && <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>}
      {children}
    </div>
  );
}
