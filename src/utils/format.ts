/** Compact number with T/B/M/K suffixes and two decimals; "—" for missing values. */
export const formatCompactNumber = (value: number | null) => {
  if (value === null) return '—';
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
};

/** Price with two decimals; "—" for missing values. */
export const formatPrice = (value: number | null) => value === null ? '—' : value.toFixed(2);
