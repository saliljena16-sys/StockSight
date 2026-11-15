import type { KeyboardEvent } from 'react';

/**
 * Where a tablist key moves focus: Left/Right step (and wrap), Home/End jump to the ends. Null for
 * any other key, which the tablist leaves alone.
 */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowRight': return (index + 1) % count;
    case 'ArrowLeft': return (index - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}

/**
 * Keyboard handling for a role="tablist" (WAI-ARIA tabs with automatic activation): the arrow keys,
 * Home and End select the next tab and move focus to it. Only the selected tab is in the Tab order
 * (tabIndex 0, the others -1), so Tab moves on to the panel.
 */
export function handleTabListKeyDown<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  values: readonly T[],
  selected: T,
  onSelect: (value: T) => void,
) {
  const tabs = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')];
  const focused = tabs.indexOf(document.activeElement as HTMLElement);
  const next = nextTabIndex(event.key, focused >= 0 ? focused : values.indexOf(selected), values.length);
  if (next === null) return;
  event.preventDefault();
  onSelect(values[next]);
  tabs[next]?.focus();
}

/** Props for one tab of a tablist whose single panel has the id `panelId`. */
export function tabProps(idPrefix: string, value: string, selected: boolean, panelId: string) {
  return {
    type: 'button' as const,
    role: 'tab' as const,
    id: `${idPrefix}-tab-${value}`,
    'aria-selected': selected,
    'aria-controls': panelId,
    tabIndex: selected ? 0 : -1,
  };
}
