import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import { calculateSummaryRow, type Performer, type PortfolioSummary as PortfolioSummaryData } from '../../utils/portfolioMetrics';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import type { Transaction } from '../../types/portfolio';
import { HEAD_CELL_CLASS, SymbolCell, TABLE_CLASS, rowProps, toneOf } from './tableParts';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData;
  sectorAllocation: Array<[string, number]>;
  transactions: Transaction[];
  /** Stocks in the selected sector; the holdings table lists those with shares. */
  filteredStocks: StockInfo[];
  /** The sector filter applies only to this tab's holdings table, so it is shown here. */
  sectorFilter: string;
  availableSectors: string[];
  onSectorChange: (sector: string) => void;
  quantities: Record<string, number> | undefined;
  averageCosts: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onEditHolding: (ticker: string) => void;
  onCashChange: (value: string) => void;
}

// Sector colours are neutral series colours, deliberately not the gain/loss colours.
const SECTOR_COLORS = ['bg-ink', 'bg-violet', 'bg-warn', 'bg-accent', 'bg-ink-dim'];

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-control border border-line p-4">
    <p className="eyebrow">{label}</p>
    {children}
  </div>
);

function PerformerTile({ label, performer }: { label: string; performer: Performer | null }) {
  return (
    <Tile label={label}>
      <p className="num mt-2 text-lg font-medium text-ink">{performer?.stock.ticker ?? '—'}</p>
      <p className={`num mt-1 text-[13px] ${performer ? toneOf(performer.change) : 'text-ink-dim'}`}>
        {performer ? `${performer.change >= 0 ? '+' : '-'}$${Math.abs(performer.change).toFixed(2)} (${performer.percent >= 0 ? '+' : ''}${performer.percent.toFixed(2)}%)` : '—'}
      </p>
    </Tile>
  );
}

/** Summary tab: return, movers, cash, sector allocation, recent transactions, and the holdings table. */
export default function PortfolioSummary({
  summary,
  sectorAllocation,
  transactions,
  filteredStocks,
  sectorFilter,
  availableSectors,
  onSectorChange,
  quantities,
  averageCosts,
  selectedTicker,
  onSelect,
  onEditHolding,
  onCashChange,
}: PortfolioSummaryProps) {
  const {
    portfolioValue,
    cashBalance,
    totalGain: portfolioTotalGain,
    totalGainPercent: portfolioTotalGainPercent,
    holdingStocks,
    bestPerformer,
    worstPerformer,
    sectorSummary,
  } = summary;
  const heldInSector = (filteredStocks ?? []).filter(stock => (quantities?.[stock.ticker] ?? 0) > 0);

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total return">
          <p className={`num mt-2 text-lg font-medium ${toneOf(portfolioTotalGain)}`}>{portfolioTotalGain >= 0 ? '+' : '-'}${Math.abs(portfolioTotalGain).toFixed(2)}</p>
          <p className={`num mt-1 text-[13px] ${toneOf(portfolioTotalGain)}`}>{portfolioTotalGainPercent >= 0 ? '+' : ''}{portfolioTotalGainPercent.toFixed(2)}%</p>
        </Tile>
        <PerformerTile label="Best performer" performer={bestPerformer} />
        <PerformerTile label="Worst performer" performer={worstPerformer} />
        <label className="block rounded-control border border-line p-4 focus-within:border-accent">
          <span className="eyebrow">Cash position</span>
          <span className="num mt-2 flex items-center text-lg font-medium text-ink">
            $<input aria-label="Cash position" type="number" inputMode="decimal" min="0" step="0.01" value={cashBalance} onChange={event => onCashChange(event.target.value)} className="min-w-0 flex-1 bg-transparent pl-1 text-ink outline-none" />
          </span>
          <span className="mt-1 block text-[13px] text-ink-dim">Counts toward portfolio value</span>
        </label>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <Tile label="Sector allocation by market value">
          <p className="mt-2 text-[13px] text-ink-muted"><span className="num text-ink">{holdingStocks.length}</span> {holdingStocks.length === 1 ? 'holding' : 'holdings'} · {sectorSummary}</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-raised">
            {sectorAllocation.map(([sector, value], index) => (
              <span key={sector} title={`${sector}: ${portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(1) : 0}%`} className={SECTOR_COLORS[index % SECTOR_COLORS.length]} style={{ width: `${portfolioValue > 0 ? (value / portfolioValue) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {sectorAllocation.map(([sector, value], index) => (
              <span key={sector} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span className={`h-2 w-2 rounded-full ${SECTOR_COLORS[index % SECTOR_COLORS.length]}`} aria-hidden="true" />
                {sector} <span className="num">{portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(0) : 0}%</span>
              </span>
            ))}
          </div>
        </Tile>

        <Tile label="Transaction history">
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-muted">Holding edits are recorded automatically.</p>
            <span className="num shrink-0 text-xs text-ink-dim">{transactions?.length ?? 0} records</span>
          </div>
          {(transactions?.length ?? 0) > 0 ? (
            <div className="mt-2 divide-y divide-line">
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-2 text-xs">
                  <span className="num font-medium text-ink">{transaction.ticker} <span className={transaction.type === 'buy' ? 'text-gain' : 'text-loss'}>{transaction.type.toUpperCase()}</span></span>
                  <span className="num text-ink-muted">{transaction.quantity.toFixed(4).replace(/\.?0+$/, '')} @ ${transaction.price.toFixed(2)}</span>
                  <time className="text-ink-dim">{new Date(transaction.date).toLocaleDateString()}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-dim">Edit a holding to create the first transaction.</p>
          )}
        </Tile>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="eyebrow text-ink-muted">Positions</h3>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <span>Sector</span>
          <select
            value={sectorFilter}
            onChange={(event) => onSectorChange(event.target.value)}
            className="field h-11 w-auto min-w-28 py-0 lg:h-9"
          >
            <option value="All">All</option>
            {availableSectors.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-control border border-line">
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              {['Symbol / Company', 'Sector', 'Shares', 'Last Price', 'Market Value', 'Day P/L', 'Day P/L %', 'Total P/L', 'Actions'].map((header) => (
                <th key={header} className={`${HEAD_CELL_CLASS} ${['Symbol / Company', 'Sector'].includes(header) ? '!text-left' : ''}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heldInSector.map((stock) => {
              const quantity = quantities?.[stock.ticker] ?? 0;
              const { marketValue, dayPnL, dayPnLPercent, totalPnL } = calculateSummaryRow(stock, quantity, averageCosts?.[stock.ticker]);

              return (
                <tr key={stock.ticker} {...rowProps(stock.ticker, selectedTicker, onSelect)}>
                  <SymbolCell ticker={stock.ticker} selected={stock.ticker === selectedTicker} onSelect={onSelect} sub={getCompanyMetadata(stock.ticker, stock.name).name} />
                  <td className="px-3 py-1 !text-left font-sans">{stock.sector}</td>
                  <td className="px-3 py-1 text-ink">{quantity}</td>
                  <td className="px-3 py-1 text-ink">${stock.currentPrice.toFixed(2)}</td>
                  <td className="px-3 py-1 text-ink">${marketValue.toFixed(2)}</td>
                  <td className={`px-3 py-1 ${toneOf(dayPnL)}`}>
                    {dayPnL >= 0 ? '+' : '-'}${Math.abs(dayPnL).toFixed(2)}
                  </td>
                  <td className={`px-3 py-1 ${toneOf(dayPnLPercent)}`}>{dayPnLPercent >= 0 ? '+' : ''}{dayPnLPercent.toFixed(2)}%</td>
                  <td className={`px-3 py-1 ${toneOf(totalPnL)}`}>
                    {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(2)}
                  </td>
                  <td className="px-3 py-1">
                    <button type="button" aria-label={`Edit ${stock.ticker} holding`} onClick={(event) => { event.stopPropagation(); onEditHolding(stock.ticker); }} className="icon-btn icon-btn-plain icon-btn-sm ml-auto">
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {heldInSector.length === 0 && (
          <p className="border-t border-line px-4 py-8 text-center text-sm text-ink-muted">
            {holdingStocks.length === 0
              ? 'No holdings yet. Add the shares you own and they appear here with their value and profit or loss.'
              : `No holdings in ${sectorFilter}.`}
          </p>
        )}
      </div>
    </div>
  );
}
