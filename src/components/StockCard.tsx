import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StockInfo } from '../utils/mockData';
import { AnalysisResult } from '../utils/technicalAnalysis';
import CompanyMark from './CompanyMark';
import { getCompanyMetadata } from '../utils/companyMetadata';

interface StockCardProps {
  stock: StockInfo;
  analysis: AnalysisResult;
  isSelected: boolean;
  onClick: () => void;
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'STRONG BUY': return 'text-[#54d99a] bg-[#54d99a]/[.06] border-[#54d99a]/25';
    case 'BUY': return 'text-[#54d99a] bg-[#54d99a]/[.06] border-[#54d99a]/25';
    case 'HOLD': return 'text-[#e4b75c] bg-[#e4b75c]/[.06] border-[#e4b75c]/25';
    case 'SELL': return 'text-[#f07878] bg-[#f07878]/[.06] border-[#f07878]/25';
    case 'STRONG SELL': return 'text-[#f07878] bg-[#f07878]/[.06] border-[#f07878]/25';
    default: return 'text-[#89918b] bg-white/[.03] border-white/[.08]';
  }
}

function getRecommendationIcon(rec: string) {
  switch (rec) {
    case 'STRONG BUY': case 'BUY': return <TrendingUp className="w-3.5 h-3.5" />;
    case 'HOLD': return <Minus className="w-3.5 h-3.5" />;
    case 'SELL': case 'STRONG SELL': return <TrendingDown className="w-3.5 h-3.5" />;
    default: return null;
  }
}

export default function StockCard({ stock, analysis, isSelected, onClick }: StockCardProps) {
  const company = getCompanyMetadata(stock.ticker, stock.name);
  const priceChange = stock.currentPrice - stock.previousClose;
  const priceChangePercent = (priceChange / stock.previousClose) * 100;
  const isPositive = priceChange >= 0;
  const recentPrices = stock.historicalData.slice(-24).map(point => point.close);
  const minPrice = Math.min(...recentPrices);
  const maxPrice = Math.max(...recentPrices);
  const sparklinePoints = recentPrices.map((price, index) => {
    const x = recentPrices.length > 1 ? (index / (recentPrices.length - 1)) * 100 : 0;
    const y = 30 - ((price - minPrice) / Math.max(maxPrice - minPrice, 1)) * 26;
    return `${x},${y}`;
  }).join(' ');

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={`relative min-h-[152px] min-w-0 w-full overflow-hidden rounded-[10px] border p-5 text-left transition-all duration-200 ${
        isSelected
          ? 'border-white/[.18] bg-[var(--surface-2)] shadow-[inset_3px_0_0_#b7f34a]'
          : 'border-white/[.1] bg-[var(--surface-1)] hover:border-white/20 hover:bg-[var(--surface-2)]'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark ticker={stock.ticker} size={30} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-white">{stock.ticker}</h3>
            <div className="mt-0.5 flex items-center gap-2">
            <p className="max-w-[150px] truncate text-xs text-[#89918b]">{company.name}</p>
            <span className={`h-1.5 w-1.5 rounded-full ${stock.isLiveData ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-label={stock.isLiveData ? 'Live data' : 'Demo data'} />
            </div>
          </div>
        </div>
        <div className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${getRecommendationColor(analysis.recommendation)}`}>
          {getRecommendationIcon(analysis.recommendation)}
          <span className="hidden min-[440px]:inline">{analysis.recommendation}</span>
          <span className="min-[440px]:hidden">{analysis.recommendation.replace('STRONG ', '')}</span>
        </div>
      </div>
      <div className="mt-5 relative z-10">
        <p className="font-mono text-[28px] font-medium tracking-[-0.04em] text-white">${stock.currentPrice.toFixed(2)}</p>
        <p className={`text-xs font-mono mt-1 ${isPositive ? 'text-lime-300' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
        </p>
      </div>
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute right-4 bottom-4 h-9 w-24 opacity-45"
      >
        <polyline
          points={sparklinePoints}
          fill="none"
          stroke={isPositive ? '#b7f34a' : '#f07878'}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </button>
  );
}
