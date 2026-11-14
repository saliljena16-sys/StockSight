import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ProjectionDataPoint, formatCurrency, formatCompact } from '../utils/financialProjection';

interface WealthProjectionChartProps {
  data: ProjectionDataPoint[];
  targetAmount: number;
  monthsToTarget: number | null;
}

// Chart colours are design tokens, referenced as CSS variables (SVG attributes accept them).
const PROJECTED = 'var(--color-gain)';
const CONTRIBUTED = 'var(--color-violet)';
const TARGET = 'var(--color-warn)';
const GRID = 'var(--color-line)';
const AXIS = 'var(--color-line-strong)';
const TICK = { fill: 'var(--color-ink-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' };

export default function WealthProjectionChart({ data, targetAmount, monthsToTarget }: WealthProjectionChartProps) {
  const sampledData = data.filter((_, i) => i % 12 === 0 || i === data.length - 1);
  const targetPoint = monthsToTarget !== null ? data.find(d => d.month === monthsToTarget) : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-control border border-line-strong bg-raised p-3 shadow-pop">
          <p className="eyebrow mb-1">Month {payload[0].payload.month}</p>
          <p className="num text-sm font-medium text-gain">{formatCurrency(payload[0].payload.projectedValue)}</p>
          <p className="num mt-1 text-xs text-ink-muted">Contributed: {formatCurrency(payload[0].payload.totalContributed)}</p>
          <p className="num text-xs text-ink-muted">Gains: {formatCurrency(payload[0].payload.gains)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="h-[280px] w-full sm:h-[320px] lg:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PROJECTED} stopOpacity={0.22} />
                <stop offset="95%" stopColor={PROJECTED} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="contributedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CONTRIBUTED} stopOpacity={0.16} />
                <stop offset="95%" stopColor={CONTRIBUTED} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              dataKey="month"
              stroke={AXIS}
              tick={TICK}
              tickFormatter={(val) => {
                const years = Math.floor(val / 12);
                return years > 0 ? years + 'y' : val + 'm';
              }}
            />
            <YAxis
              stroke={AXIS}
              tick={TICK}
              tickFormatter={(val) => formatCompact(val)}
            />
            <Tooltip content={<CustomTooltip />} />
            {targetAmount > 0 && (
              <ReferenceLine
                y={targetAmount}
                stroke={TARGET}
                strokeDasharray="5 5"
                label={{
                  value: 'Target: ' + formatCompact(targetAmount),
                  fill: TARGET,
                  fontSize: 11,
                  position: 'right',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="totalContributed"
              stroke={CONTRIBUTED}
              fill="url(#contributedGradient)"
              strokeWidth={2}
              name="Total Contributed"
            />
            <Area
              type="monotone"
              dataKey="projectedValue"
              stroke={PROJECTED}
              fill="url(#projectionGradient)"
              strokeWidth={2}
              name="Projected Value"
              dot={false}
              activeDot={{ r: 4, fill: PROJECTED, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            />
            {targetPoint && (
              <ReferenceLine x={targetPoint.month} stroke={TARGET} strokeDasharray="3 3" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="eyebrow mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-gain" aria-hidden="true" />Projected growth</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-violet" aria-hidden="true" />Total contributed</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-warn" aria-hidden="true" />Target</span>
      </div>
    </div>
  );
}
