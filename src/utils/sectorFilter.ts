import type { StockInfo } from './mockData';

type SectorFields = Pick<StockInfo, 'sector'>;

export const ALL_SECTORS = 'All';

/** Stocks in `sector`, or all of them for "All". */
export function filterStocksBySector<T extends SectorFields>(stocks: T[] | undefined, sector: string): T[] {
  return (stocks ?? []).filter(stock => sector === ALL_SECTORS || stock.sector === sector);
}

/** Distinct non-empty sectors, in first-seen order. */
export function getAvailableSectors(stocks: SectorFields[] | undefined): string[] {
  return Array.from(new Set((stocks ?? []).map(stock => stock.sector).filter(Boolean)));
}

/** True when a specific sector is selected but no loaded stock belongs to it any more. */
export function shouldResetSectorFilter(stocks: SectorFields[] | undefined, sector: string): boolean {
  return Boolean(stocks && stocks.length > 0 && sector !== ALL_SECTORS && !stocks.some(stock => stock.sector === sector));
}
