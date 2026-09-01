import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6 shadow-md ${className}`}>
      {title && <h3 className="text-lg font-semibold text-[#2C3E50] mb-3">{title}</h3>}
      {children}
    </div>
  );
}
