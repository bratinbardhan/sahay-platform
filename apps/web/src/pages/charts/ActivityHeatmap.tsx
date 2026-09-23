import { useMemo } from 'react';
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell, ResponsiveContainer } from 'recharts';
import type { HeatmapCell } from '@/lib/demoSeed';

import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface ActivityHeatmapProps {
    cells: HeatmapCell[];
}

const X_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];
const X_LABELS = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
    const data = useMemo(() => {
        return cells.map((c) => ({
            ...c,
            y: 6 - c.dayIndex,
        }));
    }, [cells]);

    if (data.length === 0) {
        return (
            <p className="text-sm text-sahay-ink/60 text-center py-8">
                No interaction density recorded yet.
            </p>
        );
    }

    return (
        <ChartShell>
            <div className="h-80 w-full pl-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
                        <XAxis
                            type="number"
                            dataKey="hour"
                            name="Hour"
                            domain={[0, 23]}
                            ticks={X_TICKS}
                            tickFormatter={(value) => X_LABELS[X_TICKS.indexOf(value)] ?? `${value}:00`}
                            stroke={SAHAY_CARETAKER.axis}
                            tick={{ fontWeight: 700, fontSize: 11 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Day"
                            domain={[0, 6]}
                            ticks={[6, 5, 4, 3, 2, 1, 0]}
                            tickFormatter={(value) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][6 - value]}
                            stroke={SAHAY_CARETAKER.axis}
                            tick={{ fontWeight: 700, fontSize: 11 }}
                            width={40}
                        />
                        <ZAxis type="number" dataKey="density" range={[40, 400]} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={sahayTooltipStyle}
                            labelStyle={{ ...sahayTooltipLabelStyle, fontWeight: 700 }}
                            itemStyle={{ fontWeight: 700, fontSize: '0.8125rem' }}
                            formatter={(value: any, name: string, props: any) => {
                                if (name === 'Hour' || name === 'Day' || name === 'density' || name === 'y') {
                                    const cell = props.payload;
                                    if (cell) {
                                        return [`Density: ${Math.round(cell.density * 100)}% | Latency: ${cell.latencyMs}ms`, 'Activity'];
                                    }
                                    return [value, name];
                                }
                                return [value, name];
                            }}
                        />
                        <Scatter name="Activity" data={data} animationDuration={CHART_ANIMATION_MS}>
                            {data.map((entry, index) => {
                                let fill = '#f8fafc';
                                if (entry.density >= 0.7) fill = '#fbbf24';
                                else if (entry.density >= 0.4) fill = '#14b8a6';
                                else if (entry.density >= 0.08) fill = '#99f6e4';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </ChartShell>
    );
}

export default ActivityHeatmap;
