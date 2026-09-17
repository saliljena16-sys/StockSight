import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StockInfo } from '../utils/mockData';
import { AnalysisResult } from '../utils/technicalAnalysis';

interface StockCardProps {
  stock: StockInfo;
  analysis: AnalysisResult;
  isSelected: boolean;
  onClick: () => void;
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'STRONG BUY': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'BUY': return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'HOLD': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'SELL': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'STRONG SELL': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
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
  const priceChange = stock.currentPrice - stock.previousClose;
  const priceChangePercent = (priceChange / stock.previousClose) * 100;
  const isPositive = priceChange >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-slate-800/80 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-bold text-lg">{stock.ticker}</h3>
          <p className="text-slate-400 text-xs truncate max-w-[140px]">{stock.name}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${getRecommendationColor(analysis.recommendation)}`}>
          {getRecommendationIcon(analysis.recommendation)}
          <span>{analysis.recommendation}</span>
        </div>
      </div>
      <div className="flex items-end justify-between mt-3">
        <div>
          <p className="text-white text-2xl font-bold">${stock.currentPrice.toFixed(2)}</p>
          <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-xs">Confidence</p>
          <p className="text-white font-semibold">{analysis.confidence}%</p>
        </div>
      </div>
    </button>
  );
}
