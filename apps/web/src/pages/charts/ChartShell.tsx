import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

export const CHART_FRAME_CLASS = 'h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] w-full';

const CHART_ANIMATION_MS = 1200;

interface ChartShellProps {
  children: ReactElement;
}

/** Responsive Recharts host used by every caretaker visualization. */
export function ChartShell({ children }: ChartShellProps) {
  return (
    <div className={CHART_FRAME_CLASS}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export { CHART_ANIMATION_MS };
