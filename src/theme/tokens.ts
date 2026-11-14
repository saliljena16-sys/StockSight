/**
 * Reads a design token at runtime, for code that cannot use CSS classes (canvas charts).
 * Tokens are the CSS variables declared in the `@theme` block of `src/index.css`.
 */
export function readToken(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Series colours for comparison charts, as CSS variable references (usable in SVG and styles). */
export const SERIES_COLORS = ['var(--color-accent)', 'var(--color-violet)', 'var(--color-warn)'] as const;
