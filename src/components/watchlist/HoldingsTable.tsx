import type { StockInfo } from '../../utils/mockData';
import { getHoldingMetrics } from '../../utils/portfolioMetrics';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import { HEAD_CELL_CLASS, SymbolCell, TABLE_CLASS, rowProps, toneOf } from './tableParts';

interface HoldingsTableProps {
  stocks: StockInfo[];
  quantities: Record<string, number> | undefined;
  averageCosts: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onEditHolding: (ticker: string) => void;
}

const NONE = '—';

/** Holdings tab: shares, cost, value and gains for every stock in the portfolio. */
export default function HoldingsTable({ stocks, quantities, averageCosts, selectedTicker, onSelect, onEditHolding }: HoldingsTableProps) {
  return (
    <table className={TABLE_CLASS}>
      <thead>
        <tr>
          {['Symbol', 'Status', 'Shares', 'Last Price', 'AC/Share', 'Total Cost ($)', 'Market Value ($)', 'Tot Div Income ($)', 'Day Gain Unrl (%)', 'Day Gain Unrl ($)', 'Tot Gain Unrl (%)', 'Tot Gain Unrl ($)', 'Realized Gain (%)', 'Realized Gain ($)'].map((header) => (
            <th key={header} className={HEAD_CELL_CLASS}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => {
          const quantity = quantities?.[stock.ticker] ?? 0;
          const isHolding = quantity > 0;
          const holdingMetrics = getHoldingMetrics(stock, quantity, averageCosts?.[stock.ticker]);
          const held = holdingMetrics.hasHolding;

          return (
            <tr key={stock.ticker} {...rowProps(stock.ticker, selectedTicker, onSelect)}>
              <SymbolCell ticker={stock.ticker} selected={stock.ticker === selectedTicker} onSelect={onSelect} sub={getCompanyMetadata(stock.ticker, stock.name).name} />
              <td className="px-3 py-1">{holdingMetrics.status}</td>
              <td className="px-3 py-1">
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditHolding(stock.ticker);
                    }}
                    aria-label={isHolding ? `Edit ${stock.ticker} holding` : `Add ${stock.ticker} shares`}
                    className="btn btn-secondary btn-sm font-sans"
                  >{isHolding ? 'Edit' : 'Add'}</button><span className="min-w-6 text-ink">{holdingMetrics.shares}</span>
                </div>
              </td>
              <td className="px-3 py-1 text-ink">${stock.currentPrice.toFixed(2)}</td>
              <td className="px-3 py-1">{held ? `$${holdingMetrics.avgCostPerShare.toFixed(2)}` : NONE}</td>
              <td className="px-3 py-1">{held ? `$${holdingMetrics.totalCost.toFixed(2)}` : NONE}</td>
              <td className="px-3 py-1 text-ink">{held ? `$${holdingMetrics.marketValue.toFixed(2)}` : NONE}</td>
              <td className="px-3 py-1">{held ? `$${holdingMetrics.totalDivIncome.toFixed(2)}` : NONE}</td>
              <td className={`px-3 py-1 ${held ? toneOf(holdingMetrics.dayGainPct) : ''}`}>
                {held ? `${holdingMetrics.dayGainPct >= 0 ? '+' : ''}${holdingMetrics.dayGainPct.toFixed(2)}%` : NONE}
              </td>
              <td className={`px-3 py-1 ${held ? toneOf(holdingMetrics.dayGainDollar) : ''}`}>
                {held ? `${holdingMetrics.dayGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.dayGainDollar).toFixed(2)}` : NONE}
              </td>
              <td className={`px-3 py-1 ${held ? toneOf(holdingMetrics.totalGainPct) : ''}`}>
                {held ? `${holdingMetrics.totalGainPct >= 0 ? '+' : ''}${holdingMetrics.totalGainPct.toFixed(2)}%` : NONE}
              </td>
              <td className={`px-3 py-1 ${held ? toneOf(holdingMetrics.totalGainDollar) : ''}`}>
                {held ? `${holdingMetrics.totalGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.totalGainDollar).toFixed(2)}` : NONE}
              </td>
              <td className="px-3 py-1">{held ? `${holdingMetrics.realizedGainPct >= 0 ? '+' : ''}${holdingMetrics.realizedGainPct.toFixed(2)}%` : NONE}</td>
              <td className="px-3 py-1">{held ? `${holdingMetrics.realizedGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.realizedGainDollar).toFixed(2)}` : NONE}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
