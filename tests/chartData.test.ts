import test from 'node:test';
import assert from 'node:assert/strict';
import { historySignature, toCandleData, toLineData } from '../src/utils/chartData.ts';

const candle = (date: string, close: number) => ({ date, open: close - 1, high: close + 1, low: close - 2, close, volume: 100 });

test('the history signature is stable across re-renders and refreshes that change nothing', () => {
  const history = [candle('2026-11-12', 100), candle('2026-11-13', 101)];
  assert.equal(historySignature(history), historySignature(history));
  assert.equal(historySignature([...history]), historySignature(history), 'a fresh array with the same candles');
  assert.equal(historySignature([]), '0');
});

test('the history signature changes when the chart data changes', () => {
  const history = [candle('2026-11-12', 100), candle('2026-11-13', 101)];
  const before = historySignature(history);
  // The quote refresh rewrites today's candle in place (same array).
  history[1].close = 103;
  history[1].high = 104;
  assert.notEqual(historySignature(history), before, 'in-place update of the last candle');
  assert.notEqual(historySignature([...history, candle('2026-11-14', 99)]), historySignature(history), 'a new session');
  assert.notEqual(historySignature(history.slice(1)), historySignature(history), 'a shorter history');
});

test('series data comes from the visible candles and skips undefined indicator values', () => {
  const points = [candle('2026-11-12', 100), candle('2026-11-13', 101)].map((point, i) => ({ point, index: i + 10 }));
  assert.deepEqual(toCandleData(points), [
    { time: '2026-11-12', open: 99, high: 101, low: 98, close: 100 },
    { time: '2026-11-13', open: 100, high: 102, low: 99, close: 101 },
  ]);
  const sma = Array(12).fill(Number.NaN);
  sma[11] = 100.5;
  assert.deepEqual(toLineData(points, sma), [{ time: '2026-11-13', value: 100.5 }], 'indexed by position in the full history');
});
