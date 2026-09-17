import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ProjectionDataPoint, formatCurrency, formatCompact } from '../utils/financialProjection';

interface WealthProjectionChartProps {
  data: ProjectionDataPoint[];
  targetAmount: number;
  monthsToTarget: number | null;
}

export default function WealthProjectionChart({ data, targetAmount, monthsToTarget }: WealthProjectionChartProps) {
  const sampledData = data.filter((_, i) => i % 12 === 0 || i === data.length - 1);
  const targetPoint = monthsToTarget !== null ? data.find(d => d.month === monthsToTarget) : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-xs mb-1">Month {payload[0].payload.month}</p>
          <p className="text-emerald-400 text-sm font-semibold">{formatCurrency(payload[0].payload.projectedValue)}</p>
          <p className="text-slate-400 text-xs">Contributed: {formatCurrency(payload[0].payload.totalContributed)}</p>
          <p className="text-amber-400 text-xs">Gains: {formatCurrency(payload[0].payload.gains)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="contributedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="month"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(val) => {
              const years = Math.floor(val / 12);
              return years > 0 ? years + 'y' : val + 'm';
            }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(val) => formatCompact(val)}
          />
          <Tooltip content={<CustomTooltip />} />
          {targetAmount > 0 && (
            <ReferenceLine
              y={targetAmount}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: 'Target: ' + formatCompact(targetAmount),
                fill: '#f59e0b',
                fontSize: 11,
                position: 'right',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="totalContributed"
            stroke="#6366f1"
            fill="url(#contributedGradient)"
            strokeWidth={2}
            name="Total Contributed"
          />
          <Area
            type="monotone"
            dataKey="projectedValue"
            stroke="#22c55e"
            fill="url(#projectionGradient)"
            strokeWidth={2}
            name="Projected Value"
            dot={false}
            activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          />
          {targetPoint && (
            <ReferenceLine x={targetPoint.month} stroke="#f59e0b" strokeDasharray="3 3" />
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500"></span>
          <span className="text-slate-400">Projected Growth</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500"></span>
          <span className="text-slate-400">Total Contributed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
          <span className="text-slate-400">Target</span>
        </span>
      </div>
    </div>
  );
}
