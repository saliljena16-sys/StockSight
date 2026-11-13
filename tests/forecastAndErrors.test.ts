import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCAGR, MIN_CAGR_SESSIONS } from '../src/utils/technicalAnalysis.ts';
import { isChunkLoadError } from '../src/utils/chunkLoadError.ts';

function dailySeries(sessions: number, startClose: number, endClose: number, startDate = '2020-01-01') {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return Array.from({ length: sessions }, (_, index) => {
    const close = startClose + ((endClose - startClose) * index) / Math.max(sessions - 1, 1);
    // ~1.45 calendar days per session, like a real trading calendar (252 sessions ≈ 365 days).
    const date = new Date(start + Math.round(index * (365.25 / 252)) * 86_400_000).toISOString().slice(0, 10);
    return { date, open: close, high: close, low: close, close, volume: 1 };
  });
}

test('CAGR is null — not a default rate — when history is missing or short', () => {
  assert.equal(calculateCAGR([]), null);
  assert.equal(calculateCAGR(dailySeries(MIN_CAGR_SESSIONS - 1, 100, 200)), null);
});

test('CAGR is null for unusable prices', () => {
  assert.equal(calculateCAGR(dailySeries(300, 0, 200)), null);
});

test('CAGR reports the real annualised rate and its date span', () => {
  // Doubling over ~5 years ≈ 14.87% a year.
  const result = calculateCAGR(dailySeries(5 * 252 + 1, 100, 200));
  assert.ok(result);
  assert.ok(Math.abs(result.rate - (Math.pow(2, 1 / result.years) - 1)) < 1e-12);
  assert.ok(Math.abs(result.years - 5) < 0.02, `years=${result.years}`);
  assert.equal(result.startDate, '2020-01-01');
});

test('CAGR is not clamped: large gains and losses are reported as measured', () => {
  const boom = calculateCAGR(dailySeries(253, 10, 100));
  assert.ok(boom && boom.rate > 5, `rate=${boom?.rate}`);
  const bust = calculateCAGR(dailySeries(253, 100, 30));
  assert.ok(bust && bust.rate < -0.6, `rate=${bust?.rate}`);
});

test('chunk load errors are recognised across browsers and bundlers', () => {
  for (const message of [
    'Failed to fetch dynamically imported module: https://stocksight.salil.best/assets/FinancialForecaster-rj1lZteJ.js',
    'error loading dynamically imported module: https://x/assets/a.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/index.css',
    'Loading chunk 42 failed.',
  ]) {
    assert.equal(isChunkLoadError(new TypeError(message)), true, message);
  }
  assert.equal(isChunkLoadError(Object.assign(new Error('x'), { name: 'ChunkLoadError' })), true);
});

test('ordinary errors are not treated as chunk load errors', () => {
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'close')")), false);
  assert.equal(isChunkLoadError(null), false);
  assert.equal(isChunkLoadError('Failed to fetch dynamically imported module'), false);
});
