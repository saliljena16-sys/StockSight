import { ArrowDownRight, ArrowUpRight, Layers3, MoreHorizontal, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import type { PortfolioSummary as PortfolioSummaryData } from '../../utils/portfolioMetrics';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import type { Transaction } from '../../types/portfolio';
import CompanyMark from '../CompanyMark';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData;
  sectorAllocation: Array<[string, number]>;
  transactions: Transaction[];
  /** Stocks in the selected sector; the holdings table lists those with shares. */
  filteredStocks: StockInfo[];
  quantities: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onEditHolding: (ticker: string) => void;
  onCashChange: (value: string) => void;
}

/** Summary tab: value and P/L cards, cash, sector allocation, recent transactions, holdings table. */
export default function PortfolioSummary({
  summary,
  sectorAllocation,
  transactions,
  filteredStocks,
  quantities,
  selectedTicker,
  onSelect,
  onEditHolding,
  onCashChange,
}: PortfolioSummaryProps) {
  const {
    portfolioValue,
    cashBalance,
    totalPortfolioValue,
    totalGain: portfolioTotalGain,
    totalGainPercent: portfolioTotalGainPercent,
    holdingStocks,
    dayChange: portfolioDayChange,
    dayChangePercent: portfolioDayChangePercent,
    bestPerformer,
    worstPerformer,
    sectorSummary,
  } = summary;

  return (
    <div className="p-4">
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
          <WalletCards className="absolute right-4 top-4 h-5 w-5 text-[#7f9186]" />
          <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Portfolio value</div>
          <div className="mt-2 font-mono text-[28px] font-medium tracking-[-.04em] text-white">${totalPortfolioValue.toFixed(2)}</div>
          <div className={`mt-1 font-mono text-[13px] ${portfolioDayChange >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
            {portfolioDayChange >= 0 ? '+' : '-'}${Math.abs(portfolioDayChange).toFixed(2)} ({portfolioDayChangePercent >= 0 ? '+' : ''}{portfolioDayChangePercent.toFixed(2)}%)
          </div>
        </div>
        <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
          {portfolioDayChange >= 0 ? <TrendingUp className="absolute right-4 top-4 h-5 w-5 text-[var(--positive)]" /> : <TrendingDown className="absolute right-4 top-4 h-5 w-5 text-[var(--negative)]" />}
          <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Day P/L</div>
          <div className={`mt-2 font-mono text-[28px] font-medium tracking-[-.04em] ${portfolioDayChange >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
            {portfolioDayChange >= 0 ? '+' : '-'}${Math.abs(portfolioDayChange).toFixed(2)}
          </div>
          <div className={`mt-1 font-mono text-[13px] ${portfolioDayChangePercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{portfolioDayChangePercent >= 0 ? '+' : ''}{portfolioDayChangePercent.toFixed(2)}%</div>
        </div>
        <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
          <Layers3 className="absolute right-4 top-4 h-5 w-5 text-[#7f9186]" />
          <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Holdings</div>
          <div className="mt-2 font-mono text-[28px] font-medium text-white">{holdingStocks.length}</div>
          <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{sectorSummary}</div>
        </div>
        <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
          <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-[var(--positive)]" />
          <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Best performer</div>
          <div className="mt-2 text-xl font-semibold text-white">{bestPerformer?.stock.ticker ?? '—'}</div>
          <div className="mt-1 font-mono text-[13px] text-[var(--positive)]">{bestPerformer ? `${bestPerformer.change >= 0 ? '+' : '-'}$${Math.abs(bestPerformer.change).toFixed(2)} (${bestPerformer.percent >= 0 ? '+' : ''}${bestPerformer.percent.toFixed(2)}%)` : '—'}</div>
        </div>
        <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
          <ArrowDownRight className="absolute right-4 top-4 h-5 w-5 text-[var(--negative)]" />
          <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Worst performer</div>
          <div className="mt-2 text-xl font-semibold text-white">{worstPerformer?.stock.ticker ?? '—'}</div>
          <div className="mt-1 font-mono text-[13px] text-[var(--negative)]">{worstPerformer ? `${worstPerformer.change >= 0 ? '+' : '-'}$${Math.abs(worstPerformer.change).toFixed(2)} (${worstPerformer.percent >= 0 ? '+' : ''}${worstPerformer.percent.toFixed(2)}%)` : '—'}</div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_2fr]">
        <div className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Total return</p><p className={`mt-2 font-mono text-lg ${portfolioTotalGain >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{portfolioTotalGain >= 0 ? '+' : '-'}${Math.abs(portfolioTotalGain).toFixed(2)} ({portfolioTotalGainPercent >= 0 ? '+' : ''}{portfolioTotalGainPercent.toFixed(2)}%)</p></div>
        <label className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Cash position</span><span className="mt-2 flex items-center font-mono text-lg text-white">$<input aria-label="Cash position" type="number" min="0" step="0.01" value={cashBalance} onChange={event => onCashChange(event.target.value)} className="min-w-0 flex-1 bg-transparent pl-1 text-white outline-none" /></span></label>
        <div className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Sector allocation by market value</p><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[.05]">{sectorAllocation.map(([sector, value], index) => <span key={sector} title={`${sector}: ${portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(1) : 0}%`} style={{ width: `${portfolioValue > 0 ? (value / portfolioValue) * 100 : 0}%`, backgroundColor: ['#b7f34a', '#9b8ce8', '#e4b75c', '#54d99a', '#f07878'][index % 5] }} />)}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{sectorAllocation.map(([sector, value]) => <span key={sector} className="text-[11px] text-[var(--text-secondary)]">{sector} {portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(0) : 0}%</span>)}</div></div>
      </div>

      <div className="mb-5 rounded-[8px] border border-white/[.08] bg-black/10 p-4">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Transaction history</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Holding edits are recorded automatically.</p></div><span className="font-mono text-xs text-[var(--text-tertiary)]">{transactions?.length ?? 0} records</span></div>
        {(transactions?.length ?? 0) > 0 ? <div className="divide-y divide-white/[.06]">{transactions.slice(0, 5).map(transaction => <div key={transaction.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-xs"><span className="font-semibold text-white">{transaction.ticker} <span className={transaction.type === 'buy' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>{transaction.type.toUpperCase()}</span></span><span className="font-mono text-[var(--text-secondary)]">{transaction.quantity.toFixed(4).replace(/\.?0+$/, '')} @ ${transaction.price.toFixed(2)}</span><time className="text-[var(--text-tertiary)]">{new Date(transaction.date).toLocaleDateString()}</time></div>)}</div> : <p className="py-3 text-xs text-[var(--text-tertiary)]">Edit a holding to create the first transaction.</p>}
      </div>

      <div className="overflow-hidden border border-white/[.07] rounded-[7px]">
        <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
          <thead className="bg-black/20">
            <tr>
              {['Symbol / Company', 'Sector', 'Shares', 'Last Price', 'Market Value', 'Day P/L', 'Day P/L %', 'Total P/L', 'Actions'].map((header) => (
                <th key={header} className={`border-b border-white/[.07] px-4 py-3 whitespace-nowrap ${['Symbol / Company', 'Sector'].includes(header) ? '!text-left' : ''}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
                {(filteredStocks ?? []).filter(stock => (quantities?.[stock.ticker] ?? 0) > 0).map((stock) => {
              const quantity = quantities?.[stock.ticker] ?? 0;
              const marketValue = stock.currentPrice * quantity;
              const dayChange = stock.currentPrice - stock.previousClose;
              const dayPnL = dayChange * quantity;
              const dayPnLPercent = stock.previousClose > 0 ? (dayChange / stock.previousClose) * 100 : 0;
              const totalCost = stock.currentPrice * quantity;
              const totalPnL = marketValue - totalCost;

              const company = getCompanyMetadata(stock.ticker, stock.name);

              return (
                <tr
                  key={stock.ticker}
                  className={`hover:bg-white/[.04] ${stock.ticker === selectedTicker ? 'bg-white/[.035]' : ''}`}
                  onClick={() => onSelect(stock.ticker)}
                >
                  <td className={`min-w-[220px] border-l-2 px-4 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                    <div className="flex items-center gap-3">
                      <CompanyMark ticker={stock.ticker} size={28} />
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{stock.ticker}</div>
                        <div className="truncate text-xs text-[var(--text-secondary)]">{company.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 !text-left">{stock.sector}</td>
                  <td className="px-4 py-3">{quantity}</td>
                  <td className="px-4 py-3 text-white">${stock.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-white">${marketValue.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-medium ${dayPnL >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                    {dayPnL >= 0 ? '+' : '-'}${Math.abs(dayPnL).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 font-medium ${dayPnLPercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{dayPnLPercent >= 0 ? '+' : ''}{dayPnLPercent.toFixed(2)}%</td>
                  <td className={`px-4 py-3 font-medium ${totalPnL >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                    {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" aria-label={`Edit ${stock.ticker} holding`} onClick={(event) => { event.stopPropagation(); onEditHolding(stock.ticker); }} className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
