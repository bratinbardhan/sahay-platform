import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Canonical Sahāy card. Uses the ambient `.sahay-surface` treatment so the very
 * same markup is flat (2px ink rule, no elevation, no motion) on a patient
 * surface and softly raised with a 220 ms transition on a caretaker surface.
 */
export function Card({ title, children, className = '', style }: CardProps) {
  return (
    <div
      className={`sahay-surface p-6 ${className}`}
      style={style}
    >
      {title && <h3 className="text-lg font-semibold text-sahay-ink mb-3">{title}</h3>}
      {children}
    </div>
  );
}
