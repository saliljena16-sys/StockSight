import type { StockInfo } from '../../utils/mockData';
import { closeToCloseReturn, yearToDateReturn } from '../../utils/marketMetrics';
import CompanyMark from '../CompanyMark';

interface PerformanceTableProps {
  stocks: StockInfo[];
  selectedTicker: string;
  onSelect: (ticker: string) => void;
}

/** Performance tab: 1D through 1Y returns per stock. */
export default function PerformanceTable({ stocks, selectedTicker, onSelect }: PerformanceTableProps) {
  return (
    <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
      <thead className="bg-black/20">
        <tr>
          {['Symbol', '1D', '1W', '1M', '3M', 'YTD', '1Y'].map((header) => (
            <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
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
            <tr
              key={stock.ticker}
              className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
              onClick={() => onSelect(stock.ticker)}
            >
              <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                <div className="flex items-center gap-2.5"><CompanyMark ticker={stock.ticker} size={24} /><span className="font-semibold text-white">{stock.ticker}</span></div>
              </td>
              <td className={`px-3 py-3 font-medium ${oneDay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneDay.toFixed(2)}%</td>
              <td className={`px-3 py-3 font-medium ${oneWeek >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneWeek.toFixed(2)}%</td>
              <td className={`px-3 py-3 font-medium ${oneMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneMonth.toFixed(2)}%</td>
              <td className={`px-3 py-3 font-medium ${threeMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{threeMonth.toFixed(2)}%</td>
              <td className={`px-3 py-3 font-medium ${ytd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ytd.toFixed(2)}%</td>
              <td className={`px-3 py-3 font-medium ${oneYear >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneYear.toFixed(2)}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
