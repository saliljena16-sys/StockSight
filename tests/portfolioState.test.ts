import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPortfolio,
  addTicker,
  createHoldingTransaction,
  incrementQuantity,
  moveEntry,
  omitKey,
  omitTicker,
  prependTransaction,
  removeTicker,
  renamePortfolioTickers,
  sanitizeQuantity,
  setAverageCost,
  setCash,
  setQuantity,
  setTickerListed,
  splitHoldings,
  syncQuantitiesWithPortfolios,
  toPortfolioState,
  withEntry,
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

test('creating, renaming and deleting portfolios', () => {
  const prev = { Core: ['AAPL'] };
  assert.deepEqual(addPortfolio(prev, 'New'), { Core: ['AAPL'], New: [] });
  assert.equal(addPortfolio(prev, 'Core'), prev);
  assert.deepEqual(withEntry({ Core: 5 }, 'New', 0), { Core: 5, New: 0 });

  assert.deepEqual(renamePortfolioTickers({ A: ['X'], B: ['Y'] }, 'A', 'C'), { B: ['Y'], C: ['X'] });
  const taken = { A: ['X'], B: ['Y'] };
  assert.equal(renamePortfolioTickers(taken, 'A', 'B'), taken);

  assert.deepEqual(moveEntry({ A: 1, B: 2 }, 'A', 'C', 0), { B: 2, C: 1 });
  assert.deepEqual(moveEntry({ B: 2 }, 'A', 'C', 0), { B: 2, C: 0 });
  // Moving onto an existing key overwrites it in place.
  assert.deepEqual(Object.entries(moveEntry({ A: 1, B: 2, C: 3 }, 'A', 'B', 0)), [['B', 1], ['C', 3]]);

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
