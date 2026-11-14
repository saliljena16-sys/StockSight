// Renders real components to HTML. Node can't load .tsx directly, so Vite's SSR module loader
// compiles them; react-dom/server renders the markup. (Effects don't run in this mode, so
// lifecycle behaviour such as the chart not being rebuilt is covered elsewhere.)
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { calculatePortfolioSummary, calculateSectorAllocation } from '../src/utils/portfolioMetrics.ts';

let vite: ViteDevServer;

before(async () => {
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'error',
    appType: 'custom',
    esbuild: { jsx: 'automatic' },
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
});

after(async () => {
  await vite?.close();
});

async function render(path: string, props: Record<string, unknown>) {
  const module = await vite.ssrLoadModule(path);
  return renderToStaticMarkup(createElement(module.default as ComponentType<Record<string, unknown>>, props));
}

const stock = (ticker: string, sector: string, currentPrice: number, previousClose: number) => ({
  ticker, name: ticker, sector, currentPrice, previousClose, volume: 0, historicalData: [],
  lastUpdated: '2026-11-13T00:00:00.000Z', isLiveData: true, dataSource: 'test', hasRealHistory: false,
});

const stocks = [stock('AAA', 'Technology', 110, 100), stock('BBB', 'Energy', 50, 55), stock('CCC', 'Energy', 20, 20)];
const quantities = { AAA: 2, BBB: 4 }; // CCC is watched but not held
const averageCosts = { AAA: 90, BBB: 60 };
const noop = () => {};

function tableProps(tableTab: string) {
  const summary = calculatePortfolioSummary(stocks as never, quantities, averageCosts, 0);
  return {
    tableTab,
    stocks,
    filteredStocks: stocks,
    sectorFilter: 'All',
    availableSectors: ['Technology', 'Energy'],
    onSectorChange: noop,
    onAddTickers: noop,
    summary,
    sectorAllocation: calculateSectorAllocation(summary.holdingStocks, quantities),
    transactions: [],
    quantities,
    averageCosts,
    selectedTicker: 'AAA',
    onSelect: noop,
    onEditHolding: noop,
    onCashChange: noop,
  };
}

test('the sector filter appears only on the Summary tab, the one it filters', async () => {
  const summary = await render('/src/components/watchlist/WatchlistTable.tsx', tableProps('summary'));
  assert.match(summary, /<select[^>]*>.*<option value="Energy">Energy<\/option>/s);
  assert.ok(summary.indexOf('<select') < summary.indexOf('Symbol / Company'), 'filter sits above the holdings table it filters');

  for (const tab of ['holdings', 'keyStats', 'performance']) {
    const html = await render('/src/components/watchlist/WatchlistTable.tsx', tableProps(tab));
    assert.ok(!html.includes('<select'), `${tab}: no sector filter`);
    assert.ok(html.includes('+ Add tickers'), `${tab}: add button still shown`);
  }
});

test('Summary rows show Total P/L from average cost and the live price', async () => {
  const html = await render('/src/components/watchlist/WatchlistTable.tsx', tableProps('summary'));
  // AAA: (110 - 90) x 2 = +$40.00; BBB: (50 - 60) x 4 = -$40.00. Unheld CCC has no row.
  assert.ok(html.includes('+$40.00'), 'AAA total P/L');
  assert.ok(html.includes('-$40.00'), 'BBB total P/L');
  assert.ok(!html.includes('Edit CCC holding'), 'unheld stock is not a Summary row');
});

test('a watched stock with no shares shows 0 shares and an Add button in Holdings', async () => {
  const html = await render('/src/components/watchlist/HoldingsTable.tsx', {
    stocks, quantities, averageCosts, selectedTicker: 'AAA', onSelect: noop, onEditHolding: noop,
  });
  const cccRow = html.slice(html.indexOf('>CCC<'));
  assert.match(cccRow, /<button[^>]*>Add<\/button><span[^>]*>0<\/span>/);
});
