import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, IChartApi, Time } from 'lightweight-charts';
import { StockDataPoint } from '../utils/mockData';
import { AnalysisResult } from '../utils/technicalAnalysis';

interface CandlestickChartProps {
  data: StockDataPoint[];
  analysis: AnalysisResult;
  ticker: string;
}

type ChartRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

const CHART_RANGES: ChartRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

function getRangeStart(range: ChartRange, latestDate: Date): Date | null {
  const start = new Date(latestDate);
  if (range === '1M') start.setMonth(start.getMonth() - 1);
  else if (range === '6M') start.setMonth(start.getMonth() - 6);
  else if (range === 'YTD') return new Date(latestDate.getFullYear(), 0, 1);
  else if (range === '1Y') start.setFullYear(start.getFullYear() - 1);
  else if (range === '5Y') start.setFullYear(start.getFullYear() - 5);
  else return null;
  return start;
}

export default function CandlestickChart({ data, analysis, ticker }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<ChartRange>('1Y');

  const visiblePoints = useMemo(() => {
    const indexed = data.map((point, index) => ({ point, index }));
    if (range === '1D') return indexed.slice(-1);
    if (range === '5D') return indexed.slice(-5);
    if (range === 'ALL' || indexed.length === 0) return indexed;

    const latestDate = new Date(`${indexed[indexed.length - 1].point.date}T00:00:00`);
    const start = getRangeStart(range, latestDate);
    return start
      ? indexed.filter(({ point }) => new Date(`${point.date}T00:00:00`) >= start)
      : indexed;
  }, [data, range]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const getChartHeight = () => Math.min(540, Math.max(360, chartContainerRef.current!.clientWidth * 0.5));
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0e171a' },
        textColor: '#7f8981',
        fontFamily: "'DM Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1b292d' },
        horzLines: { color: '#1b292d' },
      },
      crosshair: {
        vertLine: { color: '#586159', width: 1, style: 2, labelBackgroundColor: '#303731' },
        horzLine: { color: '#586159', width: 1, style: 2, labelBackgroundColor: '#303731' },
      },
      rightPriceScale: { borderColor: '#242b25' },
      timeScale: { borderColor: '#242b25', timeVisible: false },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#54d99a',
      downColor: '#f07878',
      borderDownColor: '#f07878',
      borderUpColor: '#54d99a',
      wickDownColor: '#f07878',
      wickUpColor: '#54d99a',
    });

    candleSeries.setData(
      visiblePoints.map(({ point }) => ({
        time: point.date as Time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }))
    );

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#e4b75c',
      lineWidth: 2,
      priceLineVisible: false,
    });
    sma50Series.setData(
      visiblePoints
        .map(({ point, index }) => ({ time: point.date as Time, value: analysis.sma50[index] }))
        .filter(d => !isNaN(d.value))
    );

    const sma200Series = chart.addSeries(LineSeries, {
      color: '#9b8ce8',
      lineWidth: 2,
      priceLineVisible: false,
    });
    sma200Series.setData(
      visiblePoints
        .map(({ point, index }) => ({ time: point.date as Time, value: analysis.sma200[index] }))
        .filter(d => !isNaN(d.value))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth, height: getChartHeight() });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [visiblePoints, analysis, ticker]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Chart time range">
        {CHART_RANGES.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => setRange(option)}
            aria-pressed={range === option}
            className={`min-h-10 rounded-[7px] border px-3.5 py-2 text-[13px] font-medium transition-colors ${
              range === option
                ? 'border-lime-300/25 bg-lime-300/[.1] text-lime-200'
                : 'border-transparent bg-transparent text-[#7f8981] hover:border-white/[.08] hover:bg-white/[.035] hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="relative border-t border-white/[.06] pt-3">
      <div className="absolute left-3 top-6 z-10 flex gap-4 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
          <span className="text-[#7f8981]">SMA 50</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-violet-500 inline-block"></span>
          <span className="text-[#7f8981]">SMA 200</span>
        </span>
      </div>
      <div ref={chartContainerRef} className="overflow-hidden" />
      </div>
    </div>
  );
}
