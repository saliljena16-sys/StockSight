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

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

/** Dollar amount with thousands separators and two decimals, e.g. "$17,094.94". */
export const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', TWO_DECIMALS)}`;

/** Signed dollar amount, e.g. "+$123.45" or "-$20.00". Zero is "+$0.00". */
export const formatSignedCurrency = (value: number) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString('en-US', TWO_DECIMALS)}`;

/** Signed percentage with two decimals, e.g. "+1.01%" or "-0.51%". */
export const formatSignedPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

/** Share count with up to four decimals and no trailing zeros, e.g. "12" or "2.5". */
export const formatShares = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 4 });
