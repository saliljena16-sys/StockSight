import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, IChartApi, ISeriesApi } from 'lightweight-charts';
import { StockDataPoint } from '../utils/mockData';
import { AnalysisResult } from '../utils/technicalAnalysis';
import { toCandleData, toLineData } from '../utils/chartData';
import { readColorToken, readToken } from '../theme/tokens';
import HistoryUnavailable from './HistoryUnavailable';

interface ChartSeries {
  candles: ISeriesApi<'Candlestick'>;
  sma50: ISeriesApi<'Line'>;
  sma200: ISeriesApi<'Line'>;
}

interface CandlestickChartProps {
  data: StockDataPoint[];
  /** Should be memoised by the caller: a new object updates the series (it never rebuilds the chart). */
  analysis: AnalysisResult;
  ticker: string;
  /** Shown in the empty state when no daily candles could be loaded. */
  unavailableReason?: string;
}

type ChartRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

const CHART_RANGES: ChartRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

// The chart's height follows the viewport so the whole chart sits on the first screen:
// taller on tall windows, never smaller than a readable minimum.
const CHART_HEIGHT = 'h-[clamp(13.5rem,calc(100svh-39rem),20rem)] md:h-[clamp(18rem,calc(100svh-40rem),26rem)] lg:h-[clamp(17rem,calc(100svh-34rem),34rem)]';
// The same heights as a minimum, for the "history unavailable" message that replaces the chart.
const EMPTY_STATE_HEIGHT = 'min-h-[clamp(13.5rem,calc(100svh-39rem),20rem)] md:min-h-[clamp(18rem,calc(100svh-40rem),26rem)] lg:min-h-[clamp(17rem,calc(100svh-34rem),34rem)]';

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

export default function CandlestickChart({ data, analysis, ticker, unavailableReason }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ChartSeries | null>(null);
  // The ticker|range the chart was last fitted to; refreshes of the same view keep the user's zoom.
  const fittedViewRef = useRef<string | null>(null);
  const [range, setRange] = useState<ChartRange>('1Y');
  const hasData = data.length > 0;

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

  // Create the chart once while there is data to show. Re-renders (typing in search, the 60-second
  // quote refresh) never rebuild it; the effect below only feeds new data into its series.
  // Colours and the font come from the design tokens; the size follows the container.
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const gain = readColorToken('--color-gain');
    const loss = readColorToken('--color-loss');
    const line = readColorToken('--color-line');
    const lineStrong = readColorToken('--color-line-strong');
    const labelBackground = readColorToken('--color-raised');
    const fontFamily = readToken('--font-mono');

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: readColorToken('--color-surface') },
        textColor: readColorToken('--color-ink-dim'),
        fontFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: line },
        horzLines: { color: line },
      },
      crosshair: {
        vertLine: { color: lineStrong, width: 1, style: 2, labelBackgroundColor: labelBackground },
        horzLine: { color: lineStrong, width: 1, style: 2, labelBackgroundColor: labelBackground },
      },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line, timeVisible: false },
    });

    chartRef.current = chart;
    fittedViewRef.current = null;
    seriesRef.current = {
      candles: chart.addSeries(CandlestickSeries, {
        upColor: gain,
        downColor: loss,
        borderDownColor: loss,
        borderUpColor: gain,
        wickDownColor: loss,
        wickUpColor: gain,
      }),
      sma50: chart.addSeries(LineSeries, {
        color: readColorToken('--color-warn'),
        lineWidth: 2,
        priceLineVisible: false,
      }),
      sma200: chart.addSeries(LineSeries, {
        color: readColorToken('--color-violet'),
        lineWidth: 2,
        priceLineVisible: false,
      }),
    };

    // The axis labels are drawn on a canvas, so redraw them once the web font has loaded.
    void document.fonts?.ready.then(() => {
      if (chartRef.current === chart) chart.applyOptions({ layout: { fontFamily } });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [hasData]);

  // Feed the visible candles and moving averages into the existing series. This runs only when the
  // data, indicators, stock or range change, and re-fits only for a new stock or range.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    series.candles.setData(toCandleData(visiblePoints));
    series.sma50.setData(toLineData(visiblePoints, analysis.sma50));
    series.sma200.setData(toLineData(visiblePoints, analysis.sma200));

    const view = `${ticker}|${range}`;
    if (fittedViewRef.current !== view) {
      chart.timeScale().fitContent();
      fittedViewRef.current = view;
    }
  }, [visiblePoints, analysis, ticker, range, hasData]);

  if (data.length === 0) {
    return (
      <HistoryUnavailable
        message={`The live quote for ${ticker} is current, but daily candles couldn't be loaded, so the chart, moving averages and signals are hidden. Refresh to try again.`}
        reason={unavailableReason}
        className={EMPTY_STATE_HEIGHT}
      />
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        {/* On phones the row runs edge to edge of the panel so all eight 44px ranges fit at 390px. */}
        <div className="mobile-scroll -mx-4 flex overflow-x-auto px-0.5 sm:mx-0 sm:gap-0.5 sm:px-0" role="group" aria-label="Chart time range">
          {CHART_RANGES.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className="seg"
            >
              {option}
            </button>
          ))}
        </div>
        <div className="eyebrow hidden shrink-0 items-center gap-4 sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-warn" aria-hidden="true" />SMA 50</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-violet" aria-hidden="true" />SMA 200</span>
        </div>
      </div>
      <div ref={chartContainerRef} className={`overflow-hidden ${CHART_HEIGHT}`} />
      <div className="eyebrow mt-2 flex items-center gap-4 sm:hidden">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-warn" aria-hidden="true" />SMA 50</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-violet" aria-hidden="true" />SMA 200</span>
      </div>
    </div>
  );
}
