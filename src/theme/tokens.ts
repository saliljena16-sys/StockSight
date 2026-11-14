/**
 * Design tokens at runtime, for code that cannot use CSS classes (canvas charts).
 * Tokens are the CSS variables declared in the `@theme` block of `src/index.css`.
 */

/** The raw value of a token, e.g. readToken('--font-mono'). */
export function readToken(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * A colour token resolved by the browser to rgb()/rgba() form, which canvas chart libraries can
 * parse whatever syntax the token was written in.
 */
export function readColorToken(name: `--color-${string}`): string {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/** Series colours for comparison charts, as CSS variable references (usable in SVG and styles). */
export const SERIES_COLORS = ['var(--color-accent)', 'var(--color-violet)', 'var(--color-warn)'] as const;
