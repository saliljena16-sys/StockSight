import { LineChart, PieChart, Table2, type LucideIcon } from 'lucide-react';

const STEPS: Array<{ Icon: LucideIcon; title: string; text: string }> = [
  { Icon: PieChart, title: 'Your value at a glance', text: "Portfolio value, today's change and total return, updated as prices move." },
  { Icon: LineChart, title: 'A chart for every stock', text: 'Price history with moving averages, an explainable signal, a forecast and news.' },
  { Icon: Table2, title: 'The detail when you want it', text: 'Holdings, key stats and performance tables, built only from real data.' },
];

/**
 * Shown under the hero when a portfolio has no stocks at all (for example a newly created one).
 * The hero above carries the actions; this explains what will appear once a stock is added.
 */
export default function EmptyPortfolio() {
  return (
    <section aria-label="What you get" className="grid gap-2.5 md:grid-cols-3 md:gap-3">
      {STEPS.map(({ Icon, title, text }) => (
        // A compact row on phones (icon beside the text) so all three fit on the first screen.
        <div key={title} className="flex gap-4 rounded-panel border border-dashed border-line-strong p-4 md:block md:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line"><Icon className="h-4 w-4 text-accent" aria-hidden="true" /></span>
          <div className="min-w-0 md:mt-4">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted md:mt-1.5 md:leading-6">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
