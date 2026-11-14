import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactNumber, formatPrice } from '../src/utils/format.ts';
import { annualizedVolatility30d, closeToCloseReturn, dayChangePercent, returnToCurrentPrice, yearToDateReturn } from '../src/utils/marketMetrics.ts';
import { calculatePortfolioSummary, calculateSectorAllocation, calculateSummaryRow, getHoldingMetrics } from '../src/utils/portfolioMetrics.ts';
import { getForecastInputs } from '../src/utils/forecast.ts';
import { isSearchShortcut, resolveSymbolSearch } from '../src/utils/symbolSearch.ts';
import { filterStocksBySector, getAvailableSectors, shouldResetSectorFilter } from '../src/utils/sectorFilter.ts';
import { buildCompanyNewsUrl, toCompanyNewsItems } from '../src/utils/news.ts';
import { authRedirectUrl, describeAuthError } from '../src/utils/auth.ts';

type Point = { date: string; open: number; high: number; low: number; close: number; volume: number };
const point = (date: string, close: number): Point => ({ date, open: close, high: close, low: close, close, volume: 1 });

function stock(ticker: string, overrides: Record<string, unknown> = {}) {
  return {
    ticker,
    name: ticker,
    sector: 'Technology',
    currentPrice: 110,
    previousClose: 100,
    volume: 0,
    historicalData: [] as Point[],
    lastUpdated: '2026-11-13T00:00:00.000Z',
    isLiveData: true,
    dataSource: 'test',
    hasRealHistory: false,
    ...overrides,
  };
}

test('formatters render compact numbers, prices and missing values', () => {
  assert.equal(formatCompactNumber(null), '—');
  assert.equal(formatCompactNumber(5_196_403_730_800), '5.20T');
  assert.equal(formatCompactNumber(42_590_342), '42.59M');
  assert.equal(formatCompactNumber(1_500), '1.50K');
  assert.equal(formatCompactNumber(999), '999');
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(356.064), '356.06');
});

test('day change and period returns', () => {
  assert.equal(dayChangePercent({ currentPrice: 110, previousClose: 100 }), 10);
  assert.equal(dayChangePercent({ currentPrice: 110, previousClose: 0 }), 0);

  const history = [100, 105, 120].map((close, index) => point(`2026-01-0${index + 1}`, close));
  // Close-to-close ends at the last close (120); the live-price variant ends at currentPrice (132).
  assert.equal(closeToCloseReturn({ historicalData: history }, 2), 20);
  assert.ok(Math.abs(returnToCurrentPrice({ historicalData: history, currentPrice: 132 }, 2) - 32) < 1e-9);
  // More sessions than available clamps to the first close.
  assert.equal(closeToCloseReturn({ historicalData: history }, 50), 20);
  assert.equal(closeToCloseReturn({ historicalData: [history[0]] }, 5), 0);
  assert.equal(returnToCurrentPrice({ historicalData: [], currentPrice: 1 }, 5), 0);
});

test('year-to-date return starts at the first candle of the current year', () => {
  const history = [point('2025-12-30', 50), point('2026-01-05', 100), point('2026-06-01', 120)];
  assert.equal(yearToDateReturn({ historicalData: history, currentPrice: 150 }, new Date(2026, 6, 1)), 50);
  // No candle this year: falls back to the first candle.
  assert.equal(yearToDateReturn({ historicalData: history, currentPrice: 150 }, new Date(2027, 6, 1)), 200);
  assert.equal(yearToDateReturn({ historicalData: [], currentPrice: 150 }), 0);
});

test('30-day volatility needs at least three closes', () => {
  assert.equal(annualizedVolatility30d({ historicalData: [point('2026-01-01', 1), point('2026-01-02', 2)] }), 0);
  const flat = Array.from({ length: 40 }, (_, i) => point(`2026-02-${String(i + 1).padStart(2, '0')}`, 100));
  assert.equal(annualizedVolatility30d({ historicalData: flat }), 0);
  const choppy = Array.from({ length: 40 }, (_, i) => point(`d${i}`, i % 2 ? 110 : 100));
  assert.ok(annualizedVolatility30d({ historicalData: choppy }) > 100);
});

test('portfolio summary: value, cash, cost basis, day change, performers, sectors', () => {
  const stocks = [
    stock('AAA', { currentPrice: 110, previousClose: 100, sector: 'Technology' }),
    stock('BBB', { currentPrice: 45, previousClose: 50, sector: 'Energy' }),
    stock('CCC', { currentPrice: 10, previousClose: 10, sector: 'Technology' }),
  ];
  const summary = calculatePortfolioSummary(stocks as never, { AAA: 2, BBB: 4, CCC: 0 }, { AAA: 100 }, 50);
  assert.equal(summary.portfolioValue, 2 * 110 + 4 * 45);
  assert.equal(summary.cashBalance, 50);
  assert.equal(summary.totalPortfolioValue, 400 + 50);
  // BBB has no average cost, so its basis falls back to the live price.
  assert.equal(summary.costBasis, 2 * 100 + 4 * 45);
  assert.equal(summary.totalGain, 20);
  assert.ok(Math.abs(summary.totalGainPercent - (20 / 380) * 100) < 1e-9);
  assert.deepEqual(summary.holdingStocks.map(s => s.ticker), ['AAA', 'BBB']);
  assert.equal(summary.dayChange, 2 * 10 + 4 * -5);
  assert.equal(summary.dayChangePercent, 0);
  assert.equal(summary.bestPerformer?.stock.ticker, 'AAA');
  assert.equal(summary.worstPerformer?.stock.ticker, 'BBB');
  assert.equal(summary.sectorSummary, '50% Technology');
});

test('portfolio summary with nothing held', () => {
  const summary = calculatePortfolioSummary([stock('AAA')] as never, undefined, undefined, undefined);
  assert.equal(summary.totalPortfolioValue, 0);
  assert.equal(summary.bestPerformer, null);
  assert.equal(summary.worstPerformer, null);
  assert.equal(summary.sectorSummary, 'No holdings');
  assert.equal(summary.totalGainPercent, 0);
});

test('sector allocation sums market value per sector in first-seen order', () => {
  const holdings = [stock('AAA', { sector: 'Energy', currentPrice: 10 }), stock('BBB', { sector: '', currentPrice: 5 }), stock('CCC', { sector: 'Energy', currentPrice: 1 })];
  assert.deepEqual(calculateSectorAllocation(holdings as never, { AAA: 2, BBB: 3, CCC: 4 }), [['Energy', 24], ['Unknown', 15]]);
});

test('holding metrics use the average cost, falling back to the live price', () => {
  const s = stock('AAA', { currentPrice: 110, previousClose: 100 });
  const withCost = getHoldingMetrics(s as never, 2, 90);
  assert.equal(withCost.status, 'Open');
  assert.equal(withCost.totalCost, 180);
  assert.equal(withCost.marketValue, 220);
  assert.equal(withCost.totalGainDollar, 40);
  assert.equal(withCost.dayGainDollar, 20);
  assert.equal(getHoldingMetrics(s as never, 2, undefined).totalGainDollar, 0);
  const none = getHoldingMetrics(s as never, 0, 90);
  assert.equal(none.hasHolding, false);
  assert.equal(none.status, '-');
  assert.equal(none.avgCostPerShare, 0);
});

test('forecast inputs explain why there is no rate', () => {
  assert.deepEqual(getForecastInputs(undefined), { cagr: null, unavailableReason: undefined });
  assert.equal(getForecastInputs(stock('AAA', { isLiveData: false }) as never).unavailableReason, 'Showing demo data: the price series is simulated.');
  assert.equal(getForecastInputs(stock('AAA', { historyUnavailableReason: 'Proxy down' }) as never).unavailableReason, 'Proxy down');
  assert.equal(getForecastInputs(stock('AAA') as never).unavailableReason, 'Daily price history is unavailable.');
  const short = Array.from({ length: 210 }, (_, i) => point(`2026-01-01`, 100 + i));
  assert.equal(getForecastInputs(stock('AAA', { hasRealHistory: true, historicalData: short }) as never).unavailableReason, 'Only 210 trading sessions of history are available.');
  const start = Date.UTC(2020, 0, 1);
  const long = Array.from({ length: 600 }, (_, i) => point(new Date(start + i * 2 * 86_400_000).toISOString().slice(0, 10), 100 + i));
  const ok = getForecastInputs(stock('AAA', { hasRealHistory: true, historicalData: long }) as never);
  assert.ok(ok.cagr && ok.cagr.rate > 0);
  assert.equal(ok.unavailableReason, undefined);
});

test('symbol search resolves blank, existing and new tickers', () => {
  assert.deepEqual(resolveSymbolSearch('   ', ['AAPL']), { type: 'none' });
  assert.deepEqual(resolveSymbolSearch(' aapl ', ['AAPL']), { type: 'select', ticker: 'AAPL' });
  assert.deepEqual(resolveSymbolSearch('ibm', ['AAPL']), { type: 'add', ticker: 'IBM' });
  assert.equal(isSearchShortcut({ key: 'k', ctrlKey: true, metaKey: false }), true);
  assert.equal(isSearchShortcut({ key: 'K', ctrlKey: false, metaKey: true }), true);
  assert.equal(isSearchShortcut({ key: 'k', ctrlKey: false, metaKey: false }), false);
  assert.equal(isSearchShortcut({ key: 'j', ctrlKey: true, metaKey: false }), false);
});

test('sector selection helpers', () => {
  const stocks = [{ sector: 'Energy' }, { sector: '' }, { sector: 'Technology' }, { sector: 'Energy' }];
  assert.deepEqual(getAvailableSectors(stocks), ['Energy', 'Technology']);
  assert.equal(filterStocksBySector(stocks, 'All').length, 4);
  assert.equal(filterStocksBySector(stocks, 'Energy').length, 2);
  assert.deepEqual(filterStocksBySector(undefined, 'All'), []);
  assert.equal(shouldResetSectorFilter(stocks, 'Healthcare'), true);
  assert.equal(shouldResetSectorFilter(stocks, 'Energy'), false);
  assert.equal(shouldResetSectorFilter(stocks, 'All'), false);
  assert.equal(shouldResetSectorFilter([], 'Healthcare'), false);
  assert.equal(shouldResetSectorFilter(undefined, 'Healthcare'), false);
});

test('company news URL covers the last seven days', () => {
  const url = buildCompanyNewsUrl('AAPL', 'key', new Date('2026-11-13T15:00:00Z'));
  assert.equal(url, 'https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2026-11-06&to=2026-11-13&token=key');
  assert.equal(toCompanyNewsItems(Array.from({ length: 9 }, (_, i) => ({ headline: String(i) }))).length, 5);
  assert.deepEqual(toCompanyNewsItems({ error: 'nope' }), []);
});

test('auth helpers', () => {
  assert.equal(describeAuthError('Email not confirmed'), 'Verify your email using the confirmation link before signing in.');
  assert.equal(describeAuthError('Invalid login credentials'), 'Invalid login credentials');
  assert.equal(authRedirectUrl('https://stocksight.salil.best'), 'https://stocksight.salil.best/');
});

test('Summary row Total P/L uses the average cost and the live price', () => {
  const s = stock('AAA', { currentPrice: 110, previousClose: 100 });
  const row = calculateSummaryRow(s as never, 2, 90);
  assert.equal(row.marketValue, 220);
  assert.equal(row.totalPnL, (110 - 90) * 2);
  assert.equal(row.dayPnL, 20);
  assert.ok(Math.abs(row.dayPnLPercent - 10) < 1e-9);
  assert.equal(calculateSummaryRow(s as never, 3, 130).totalPnL, -60, 'a loss is negative');
  assert.equal(calculateSummaryRow(s as never, 2, undefined).totalPnL, 0, 'no cost entered: P/L 0');
  // Same figure as the Holdings tab, and the rows add up to the portfolio's total gain.
  assert.equal(row.totalPnL, getHoldingMetrics(s as never, 2, 90).totalGainDollar);
  const t = stock('BBB', { currentPrice: 50, previousClose: 55 });
  const summary = calculatePortfolioSummary([s, t] as never, { AAA: 2, BBB: 4 }, { AAA: 90, BBB: 60 }, 0);
  const rows = calculateSummaryRow(s as never, 2, 90).totalPnL + calculateSummaryRow(t as never, 4, 60).totalPnL;
  assert.equal(rows, summary.totalGain);
});
