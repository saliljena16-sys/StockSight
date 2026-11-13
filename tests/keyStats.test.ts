import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateKeyStats } from '../src/utils/keyStats.ts';

// 300 consecutive calendar days ending 2026-11-12, plus one point older than a year.
function buildHistory() {
  const points = [{ date: '2025-06-01', open: 1, high: 999, low: 0.5, close: 1, volume: 5 }];
  const end = Date.UTC(2026, 10, 12);
  for (let i = 299; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    const close = 100 + (299 - i) * 0.1;
    points.push({ date, open: close, high: close + 1, low: close - 1, close, volume: 1_000 + (299 - i) });
  }
  return points;
}

const live = {
  currentPrice: 130,
  isLiveData: true,
  hasRealHistory: true,
  historicalData: buildHistory(),
  sharesOutstanding: 1_000_000,
};

test('market cap is price × real shares outstanding', () => {
  assert.equal(calculateKeyStats(live).marketCap, 130_000_000);
  assert.equal(calculateKeyStats({ ...live, sharesOutstanding: undefined }).marketCap, null);
  assert.equal(calculateKeyStats({ ...live, sharesOutstanding: 0 }).marketCap, null);
});

test('52-week range excludes candles older than one year', () => {
  const stats = calculateKeyStats(live);
  assert.equal(stats.week52High, 100 + 299 * 0.1 + 1);
  assert.equal(stats.week52Low, 99);
});

test('volume uses the latest candle and a 63-session average', () => {
  const stats = calculateKeyStats(live);
  assert.equal(stats.lastVolume, 1_299);
  assert.equal(stats.lastVolumeDate, '2026-11-12');
  // Volumes 1237..1299 → mean 1268.
  assert.equal(stats.avgVolume3M, 1_268);
});

test('missing history yields nulls for history-derived stats but keeps the live price', () => {
  const stats = calculateKeyStats({ ...live, hasRealHistory: false, historicalData: [] });
  assert.equal(stats.lastPrice, 130);
  assert.equal(stats.marketCap, 130_000_000);
  assert.equal(stats.lastVolume, null);
  assert.equal(stats.avgVolume3M, null);
  assert.equal(stats.week52Low, null);
  assert.equal(stats.week52High, null);
});

test('demo data reports nothing', () => {
  const stats = calculateKeyStats({ ...live, isLiveData: false });
  assert.ok(Object.values(stats).every(value => value === null));
});
