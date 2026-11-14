import type { StockInfo } from '../../utils/mockData';
import { closeToCloseReturn, yearToDateReturn } from '../../utils/marketMetrics';
import { HEAD_CELL_CLASS, SymbolCell, TABLE_CLASS, rowProps, toneOf } from './tableParts';

interface PerformanceTableProps {
  stocks: StockInfo[];
  selectedTicker: string;
  onSelect: (ticker: string) => void;
}

/** Performance tab: 1D through 1Y returns per stock. */
export default function PerformanceTable({ stocks, selectedTicker, onSelect }: PerformanceTableProps) {
  return (
    <table className={TABLE_CLASS}>
      <thead>
        <tr>
          {['Symbol', '1D', '1W', '1M', '3M', 'YTD', '1Y'].map((header) => (
            <th key={header} className={HEAD_CELL_CLASS}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => {
          const oneDay = ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100;
          const oneWeek = closeToCloseReturn(stock, 5);
          const oneMonth = closeToCloseReturn(stock, 21);
          const threeMonth = closeToCloseReturn(stock, 63);
          const ytd = yearToDateReturn(stock);
          const oneYear = closeToCloseReturn(stock, 252);

          return (
            <tr key={stock.ticker} {...rowProps(stock.ticker, selectedTicker, onSelect)}>
              <SymbolCell ticker={stock.ticker} selected={stock.ticker === selectedTicker} onSelect={onSelect} />
              {[oneDay, oneWeek, oneMonth, threeMonth, ytd, oneYear].map((value, index) => (
                <td key={index} className={`px-3 py-1 ${toneOf(value)}`}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
