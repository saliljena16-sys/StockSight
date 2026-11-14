import { Activity, Newspaper, PieChart, type LucideIcon } from 'lucide-react';
import type { PrimaryView } from '../../types/views';

/** The primary navigation, shared by the header (tablet and up) and the phone tab bar. */
export const NAV_ITEMS: Array<{ view: PrimaryView; label: string; Icon: LucideIcon }> = [
  { view: 'portfolio', label: 'Portfolio', Icon: PieChart },
  { view: 'insights', label: 'Insights', Icon: Activity },
  { view: 'news', label: 'News', Icon: Newspaper },
];
