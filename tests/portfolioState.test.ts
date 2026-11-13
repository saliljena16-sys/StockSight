import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTicker,
  createHoldingTransaction,
  createPortfolioIn,
  incrementQuantity,
  omitKey,
  omitTicker,
  prependTransaction,
  removeTicker,
  renamePortfolioIn,
  sanitizeQuantity,
  setAverageCost,
  setCash,
  setQuantity,
  setTickerListed,
  splitHoldings,
  syncQuantitiesWithPortfolios,
  toPortfolioState,
} from '../src/utils/portfolioState.ts';

test('listing and unlisting tickers', () => {
  const prev = { Core: ['AAPL'] };
  assert.deepEqual(addTicker(prev, 'Core', 'MSFT'), { Core: ['AAPL', 'MSFT'] });
  assert.equal(addTicker(prev, 'Core', 'AAPL'), prev, 'already listed: same object');
  assert.deepEqual(addTicker(prev, 'New', 'KO'), { Core: ['AAPL'], New: ['KO'] });
  assert.deepEqual(removeTicker({ Core: ['AAPL', 'MSFT'] }, 'Core', 'AAPL'), { Core: ['MSFT'] });
  assert.deepEqual(removeTicker({}, 'Core', 'AAPL'), { Core: [] });
});

test('list membership follows the share count', () => {
  const prev = { Core: ['AAPL'] };
  assert.deepEqual(setTickerListed(prev, 'Core', 'MSFT', 2), { Core: ['AAPL', 'MSFT'] });
  assert.deepEqual(setTickerListed(prev, 'Core', 'AAPL', 0), { Core: [] });
  assert.equal(setTickerListed(prev, 'Core', 'AAPL', 3), prev);
  assert.equal(setTickerListed(prev, 'Core', 'MSFT', 0), prev);
});

test('share counts, average costs and cash', () => {
  assert.equal(sanitizeQuantity(-2), 0);
  assert.equal(sanitizeQuantity(Number.NaN), 0);
  assert.equal(sanitizeQuantity(2.5), 2.5);

  assert.deepEqual(incrementQuantity({}, 'Core', 'AAPL'), { Core: { AAPL: 1 } });
  assert.deepEqual(incrementQuantity({ Core: { AAPL: 2 } }, 'Core', 'AAPL'), { Core: { AAPL: 3 } });

  assert.deepEqual(setQuantity({ Core: { AAPL: 2, KO: 1 } }, 'Core', 'AAPL', 5), { Core: { AAPL: 5, KO: 1 } });
  assert.deepEqual(setQuantity({ Core: { AAPL: 2, KO: 1 } }, 'Core', 'AAPL', 0), { Core: { KO: 1 } });

  assert.deepEqual(omitTicker({ Core: { AAPL: 2, KO: 1 }, Other: { AAPL: 9 } }, 'Core', 'AAPL'), { Core: { KO: 1 }, Other: { AAPL: 9 } });
  assert.deepEqual(setAverageCost({}, 'Core', 'AAPL', 150), { Core: { AAPL: 150 } });

  assert.deepEqual(setCash({ Core: 1 }, 'Core', '12.5'), { Core: 12.5 });
  assert.deepEqual(setCash({ Core: 1 }, 'Core', '-4'), { Core: 0 });
  assert.deepEqual(setCash({ Core: 1 }, 'Core', 'abc'), { Core: 0 });
});

test('share counts are synced to the listed tickers', () => {
  const prev = { Core: { AAPL: 3, OLD: 2 }, Deleted: { X: 1 } };
  const portfolios = { Core: ['AAPL', 'MSFT'], Empty: [] };
  const next = syncQuantitiesWithPortfolios(prev, portfolios);
  assert.deepEqual(next, { Core: { AAPL: 3, MSFT: 1 }, Empty: {} });
  assert.deepEqual(prev, { Core: { AAPL: 3, OLD: 2 }, Deleted: { X: 1 } }, 'input is not mutated');
  const same = { Core: { AAPL: 3 } };
  assert.notEqual(syncQuantitiesWithPortfolios(same, { Core: ['AAPL'] }), same, 'always a new object');
});

test('holding edits record a buy or sell for the change in shares', () => {
  const now = new Date('2026-11-13T15:00:00.000Z');
  assert.deepEqual(createHoldingTransaction('AAPL', 2, 5, 150, now), {
    id: `${now.getTime()}-AAPL`, ticker: 'AAPL', type: 'buy', quantity: 3, price: 150, date: '2026-11-13T15:00:00.000Z',
  });
  assert.equal(createHoldingTransaction('AAPL', 5, 2, 150, now)?.type, 'sell');
  assert.equal(createHoldingTransaction('AAPL', 5, 2, 150, now)?.quantity, 3);
  assert.equal(createHoldingTransaction('AAPL', 5, 5.0000001, 150, now), null);
  assert.equal(createHoldingTransaction('AAPL', 5, Number.NaN, 150, now), null);

  const first = createHoldingTransaction('AAPL', 0, 1, 1, now)!;
  const second = createHoldingTransaction('KO', 0, 1, 1, now)!;
  const list = prependTransaction(prependTransaction({}, 'Core', first), 'Core', second);
  assert.deepEqual(list.Core.map(t => t.ticker), ['KO', 'AAPL'], 'newest first');
});

// Two portfolios with real data, matching the collision the earlier equivalence harness recorded.
const maps = () => ({
  portfolios: { Core: ['AAPL'], Second: ['TSLA', 'JPM'] },
  quantities: { Core: { AAPL: 10 }, Second: { TSLA: 3, JPM: 1 } },
  averageCosts: { Core: { AAPL: 150 }, Second: { TSLA: 200, JPM: 120 } },
  cash: { Core: 1234.5, Second: 50 },
  transactions: { Core: [], Second: [{ id: 't1', ticker: 'TSLA', type: 'buy' as const, quantity: 3, price: 200, date: '2026-01-02T00:00:00.000Z' }] },
});

test('creating a portfolio adds empty entries to every map', () => {
  const next = createPortfolioIn(maps(), 'Growth');
  assert.ok(next);
  assert.deepEqual(next.portfolios.Growth, []);
  assert.deepEqual(next.quantities.Growth, {});
  assert.deepEqual(next.averageCosts.Growth, {});
  assert.equal(next.cash.Growth, 0);
  assert.deepEqual(next.transactions.Growth, []);
  assert.deepEqual(next.quantities.Second, { TSLA: 3, JPM: 1 });
});

test('creating a portfolio with an existing name is refused and resets nothing', () => {
  assert.equal(createPortfolioIn(maps(), 'Second'), null);
  assert.equal(createPortfolioIn(maps(), ' second '), null);
});

test('renaming moves every map entry to the new name', () => {
  const next = renamePortfolioIn(maps(), 'Core', 'Long term');
  assert.ok(next);
  assert.deepEqual(Object.keys(next.portfolios), ['Second', 'Long term']);
  assert.deepEqual(next.quantities['Long term'], { AAPL: 10 });
  assert.deepEqual(next.averageCosts['Long term'], { AAPL: 150 });
  assert.equal(next.cash['Long term'], 1234.5);
  assert.equal('Core' in next.cash, false);
  assert.equal('Core' in next.quantities, false);
});

test('renaming onto another portfolio is refused and overwrites nothing', () => {
  assert.equal(renamePortfolioIn(maps(), 'Core', 'Second'), null);
  assert.equal(renamePortfolioIn(maps(), 'Core', 'SECOND'), null);
  // Re-casing its own name is allowed; an unchanged name or a missing source is a no-op.
  assert.ok(renamePortfolioIn(maps(), 'Core', 'CORE'));
  assert.equal(renamePortfolioIn(maps(), 'Core', 'Core'), null);
  assert.equal(renamePortfolioIn(maps(), 'Nope', 'Other'), null);
});

test('deleting a portfolio removes only its key', () => {
  assert.deepEqual(omitKey({ A: 1, B: 2 }, 'A'), { B: 2 });
});

test('saved holdings round-trip through the share-count and cost maps', () => {
  const holdings = { Core: { AAPL: { quantity: 2, averageCost: 150 }, KO: { quantity: 1, averageCost: 55 } }, Empty: {} };
  const { quantities, averageCosts } = splitHoldings(holdings);
  assert.deepEqual(quantities, { Core: { AAPL: 2, KO: 1 }, Empty: {} });
  assert.deepEqual(averageCosts, { Core: { AAPL: 150, KO: 55 }, Empty: {} });

  const state = toPortfolioState({
    portfolios: { Core: ['AAPL', 'KO'], Empty: [] },
    quantities: { ...quantities, Stale: { X: 1 } },
    averageCosts: { Core: { AAPL: 150 } },
    cash: { Core: 10 },
    transactions: { Core: [] },
  });
  assert.deepEqual(Object.keys(state), ['portfolios', 'holdings', 'cash', 'transactions']);
  assert.deepEqual(state.holdings, { Core: { AAPL: { quantity: 2, averageCost: 150 }, KO: { quantity: 1, averageCost: 0 } }, Empty: {} });
});
