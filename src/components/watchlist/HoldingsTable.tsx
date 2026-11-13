import type { StockInfo } from '../../utils/mockData';
import { getHoldingMetrics } from '../../utils/portfolioMetrics';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import CompanyMark from '../CompanyMark';

interface HoldingsTableProps {
  stocks: StockInfo[];
  quantities: Record<string, number> | undefined;
  averageCosts: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onEditHolding: (ticker: string) => void;
}

/** Holdings tab: shares, cost, value and gains for every stock in the portfolio. */
export default function HoldingsTable({ stocks, quantities, averageCosts, selectedTicker, onSelect, onEditHolding }: HoldingsTableProps) {
  return (
    <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
      <thead className="bg-black/20">
        <tr>
          {['Symbol', 'Status', 'Shares', 'Last Price', 'AC/Share', 'Total Cost ($)', 'Market Value ($)', 'Tot Div Income ($)', 'Day Gain Unrl (%)', 'Day Gain Unrl ($)', 'Tot Gain Unrl (%)', 'Tot Gain Unrl ($)', 'Realized Gain (%)', 'Realized Gain ($)'].map((header) => (
            <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => {
          const quantity = quantities?.[stock.ticker] ?? 0;
          const isHolding = quantity > 0;
          const holdingMetrics = getHoldingMetrics(stock, quantity, averageCosts?.[stock.ticker]);

          return (
            <tr
              key={stock.ticker}
              className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
              onClick={() => onSelect(stock.ticker)}
            >
              <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                <div className="flex min-w-[168px] items-center gap-2.5">
                  <CompanyMark ticker={stock.ticker} size={24} />
                  <div>
                    <div className="font-semibold text-white">{stock.ticker}</div>
                    <div className="max-w-[130px] truncate text-[11px] text-[var(--text-secondary)]">{getCompanyMetadata(stock.ticker, stock.name).name}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-slate-300">{holdingMetrics.status}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditHolding(stock.ticker);
                    }}
                    className="rounded-[5px] border border-white/[.1] bg-white/[.03] px-2 py-1 text-xs font-medium text-[#a2aaa4] hover:border-white/20 hover:text-white"
                  >
                    {isHolding ? 'Edit' : 'Add'}
                  </button>
                  <span className="text-xs text-slate-400">{holdingMetrics.shares}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-white">${stock.currentPrice.toFixed(2)}</td>
              <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.avgCostPerShare.toFixed(2)}` : '--'}</td>
              <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.totalCost.toFixed(2)}` : '--'}</td>
              <td className="px-3 py-3 text-white">{holdingMetrics.hasHolding ? `$${holdingMetrics.marketValue.toFixed(2)}` : '--'}</td>
              <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.totalDivIncome.toFixed(2)}` : '--'}</td>
              <td className={`px-3 py-3 font-medium ${holdingMetrics.dayGainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {holdingMetrics.hasHolding ? `${holdingMetrics.dayGainPct >= 0 ? '+' : ''}${holdingMetrics.dayGainPct.toFixed(2)}%` : '--'}
              </td>
              <td className={`px-3 py-3 font-medium ${holdingMetrics.dayGainDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {holdingMetrics.hasHolding ? `${holdingMetrics.dayGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.dayGainDollar).toFixed(2)}` : '--'}
              </td>
              <td className={`px-3 py-3 font-medium ${holdingMetrics.totalGainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {holdingMetrics.hasHolding ? `${holdingMetrics.totalGainPct >= 0 ? '+' : ''}${holdingMetrics.totalGainPct.toFixed(2)}%` : '--'}
              </td>
              <td className={`px-3 py-3 font-medium ${holdingMetrics.totalGainDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {holdingMetrics.hasHolding ? `${holdingMetrics.totalGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.totalGainDollar).toFixed(2)}` : '--'}
              </td>
              <td className="px-3 py-3">{holdingMetrics.hasHolding ? `${holdingMetrics.realizedGainPct >= 0 ? '+' : ''}${holdingMetrics.realizedGainPct.toFixed(2)}%` : '--'}</td>
              <td className="px-3 py-3">{holdingMetrics.hasHolding ? `${holdingMetrics.realizedGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.realizedGainDollar).toFixed(2)}` : '--'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
