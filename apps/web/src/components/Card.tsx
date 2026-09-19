import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Canonical Sahāy card. Uses the ambient `.sahay-surface` treatment so the very
 * same markup is flat (2px ink rule, no elevation, no motion) on a patient
 * surface and softly raised with a 220 ms transition on a caretaker surface.
 */
export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`sahay-surface p-6 shadow-caretaker-card hover:shadow-caretaker-raised hover:-translate-y-1 transition-all duration-care ease-care ${className}`}>
      {title && <h3 className="text-lg font-semibold text-sahay-ink mb-3">{title}</h3>}
      {children}
    </div>
  );
}
