import { useState } from 'react';
import { ArrowRight, Clock3, ExternalLink, Newspaper } from 'lucide-react';
import CompanyMark from './CompanyMark';
import type { NewsItem } from '../types/news';

interface LatestNewsPanelProps {
  ticker: string;
  items: NewsItem[];
  loading: boolean;
}

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return '';
  const milliseconds = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  const hours = Math.max(1, Math.floor((Date.now() - milliseconds) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NewsThumbnail({ src, ticker }: { src?: string; ticker: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="grid h-16 w-full place-items-center rounded-control border border-line bg-raised">
        <CompanyMark ticker={ticker} size={28} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="h-16 w-full rounded-control border border-line object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/** The News tab of the stock detail panel: the last week of company headlines. */
export default function LatestNewsPanel({ ticker, items, loading }: LatestNewsPanelProps) {
  if (loading) {
    return (
      <div className="grid gap-x-8 xl:grid-cols-2" aria-busy="true" aria-label={`Loading ${ticker} news`}>
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-line py-4">
            <div className="skeleton h-16" />
            <div className="space-y-2 py-1">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-control border border-dashed border-line-strong px-6 py-10 text-center">
        <span className="mb-1 grid h-10 w-10 place-items-center rounded-full border border-line"><Newspaper className="h-4 w-4 text-ink-dim" aria-hidden="true" /></span>
        <p className="text-sm font-semibold text-ink">No recent news</p>
        <p className="max-w-md text-[13px] leading-6 text-ink-muted">No recent company news is available for {ticker} right now.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-x-8 xl:grid-cols-2">
        {items.map((item) => (
          <a
            key={`${item.source}-${item.datetime}-${item.headline}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-line py-4"
          >
            <NewsThumbnail src={item.image} ticker={ticker} />

            <div className="min-w-0">
              <div className="eyebrow mb-1.5 flex items-center gap-2">
                <span className="truncate text-ink-muted">{item.source || 'Market news'}</span>
                {item.datetime > 0 && <span className="flex shrink-0 items-center gap-1 normal-case tracking-normal"><Clock3 className="h-3 w-3" aria-hidden="true" />{formatTimeAgo(item.datetime)}</span>}
                <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold leading-snug text-ink group-hover:text-ink-bright">
                {item.headline}
              </h3>
              {item.summary && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-muted">
                  {item.summary}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>

      <a
        href={`https://finance.yahoo.com/quote/${ticker}/news/`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-quiet btn-sm -ml-3 mt-3"
      >
        View all news <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
