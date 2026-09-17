import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, IChartApi, Time } from 'lightweight-charts';
import { StockDataPoint } from '../utils/mockData';
import { AnalysisResult } from '../utils/technicalAnalysis';

interface CandlestickChartProps {
  data: StockDataPoint[];
  analysis: AnalysisResult;
  ticker: string;
}

export default function CandlestickChart({ data, analysis, ticker }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: { color: '#475569', width: 1, style: 2, labelBackgroundColor: '#475569' },
        horzLine: { color: '#475569', width: 1, style: 2, labelBackgroundColor: '#475569' },
      },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: false },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    candleSeries.setData(
      data.map(d => ({
        time: d.date as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
    });
    sma50Series.setData(
      data
        .map((d, i) => ({ time: d.date as Time, value: analysis.sma50[i] }))
        .filter(d => !isNaN(d.value))
    );

    const sma200Series = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false,
    });
    sma200Series.setData(
      data
        .map((d, i) => ({ time: d.date as Time, value: analysis.sma200[i] }))
        .filter(d => !isNaN(d.value))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
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
  }, [data, analysis, ticker]);

  return (
    <div className="relative">
      <div className="absolute top-3 left-3 z-10 flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
          <span className="text-slate-400">SMA 50</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-violet-500 inline-block"></span>
          <span className="text-slate-400">SMA 200</span>
        </span>
      </div>
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
