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
        <div className="bg-[#151a16] border border-white/[.12] rounded-[7px] p-3 shadow-xl">
          <p className="text-[#89918b] text-xs mb-1">Month {payload[0].payload.month}</p>
          <p className="text-[#54d99a] text-sm font-mono font-medium">{formatCurrency(payload[0].payload.projectedValue)}</p>
          <p className="text-[#89918b] text-xs">Contributed: {formatCurrency(payload[0].payload.totalContributed)}</p>
          <p className="text-[#e4b75c] text-xs">Gains: {formatCurrency(payload[0].payload.gains)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[380px] w-full lg:h-[460px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#54d99a" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="contributedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9b8ce8" stopOpacity={0.16} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a211c" />
          <XAxis
            dataKey="month"
            stroke="#303831"
            tick={{ fill: '#7f8981', fontSize: 10, fontFamily: 'DM Mono' }}
            tickFormatter={(val) => {
              const years = Math.floor(val / 12);
              return years > 0 ? years + 'y' : val + 'm';
            }}
          />
          <YAxis
            stroke="#303831"
            tick={{ fill: '#7f8981', fontSize: 10, fontFamily: 'DM Mono' }}
            tickFormatter={(val) => formatCompact(val)}
          />
          <Tooltip content={<CustomTooltip />} />
          {targetAmount > 0 && (
            <ReferenceLine
              y={targetAmount}
              stroke="#e4b75c"
              strokeDasharray="5 5"
              label={{
                value: 'Target: ' + formatCompact(targetAmount),
                fill: '#e4b75c',
                fontSize: 11,
                position: 'right',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="totalContributed"
            stroke="#9b8ce8"
            fill="url(#contributedGradient)"
            strokeWidth={2}
            name="Total Contributed"
          />
          <Area
            type="monotone"
            dataKey="projectedValue"
            stroke="#54d99a"
            fill="url(#projectionGradient)"
            strokeWidth={2}
            name="Projected Value"
            dot={false}
            activeDot={{ r: 4, fill: '#54d99a', stroke: '#101411', strokeWidth: 2 }}
          />
          {targetPoint && (
            <ReferenceLine x={targetPoint.month} stroke="#e4b75c" strokeDasharray="3 3" />
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500"></span>
          <span className="text-[#89918b]">Projected growth</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500"></span>
          <span className="text-[#89918b]">Total contributed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
          <span className="text-[#89918b]">Target</span>
        </span>
      </div>
    </div>
  );
}
