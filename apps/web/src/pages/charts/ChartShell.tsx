import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

export const CHART_FRAME_CLASS = 'w-full h-72 min-h-[288px]';

/** Clinical telemetry should settle immediately; motion adds noise to trends. */
const CHART_ANIMATION_MS = 0;

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
