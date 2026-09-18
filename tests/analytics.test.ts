import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjection } from '../src/utils/financialProjection.ts';
import { calculatePerformance } from '../src/utils/performance.ts';

test('projection reaches a feasible target', () => {
  const result = calculateProjection({ currentInvestment: 10_000, monthlyContribution: 500, targetAmount: 100_000, annualReturnRate: 0.08 });
  assert.ok(result.monthsToTarget !== null && result.monthsToTarget > 0);
  assert.ok(result.totalGain > 0);
});

test('performance reports return, volatility, and drawdown', () => {
  const closes = [100, 110, 90, 120];
  const data = closes.map((close, index) => ({ date: `2026-01-0${index + 1}`, open: close, high: close, low: close, close, volume: 1000 }));
  const result = calculatePerformance(data);
  assert.ok(Math.abs(result.returnPercent - 20) < 0.0001);
  assert.ok(result.annualizedVolatility > 0);
  assert.ok(result.maxDrawdown < 0);
  assert.equal(result.normalized[0].value, 100);
});

test('performance handles insufficient data safely', () => {
  assert.deepEqual(calculatePerformance([]), { returnPercent: 0, annualizedVolatility: 0, maxDrawdown: 0, normalized: [] });
});
