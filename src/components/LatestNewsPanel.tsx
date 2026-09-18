import { useState } from 'react';
import { ArrowRight, Clock3, ExternalLink, Loader2 } from 'lucide-react';
import CompanyMark from './CompanyMark';

interface NewsItem {
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
  image?: string;
}

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

function NewsThumbnail({ src, ticker, prominent }: { src?: string; ticker: string; prominent: boolean }) {
  const [failed, setFailed] = useState(false);
  const height = prominent ? 'h-[82px]' : 'h-[64px]';

  if (!src || failed) {
    return (
      <div className={`grid w-full place-items-center rounded-[7px] border border-white/[.08] bg-[var(--surface-2)] ${height}`}>
        <CompanyMark ticker={ticker} size={prominent ? 38 : 30} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`w-full rounded-[7px] border border-white/[.08] object-cover ${height}`}
      onError={() => setFailed(true)}
    />
  );
}

export default function LatestNewsPanel({ ticker, items, loading }: LatestNewsPanelProps) {
  return (
    <aside className="h-full rounded-[10px] border border-white/[.1] bg-[var(--surface-1)] p-5 xl:p-6">
      <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
        <h2 className="text-lg font-semibold tracking-[-.02em] text-white">Latest News</h2>
        <span className="font-mono text-xs text-[var(--text-secondary)]">{ticker}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading market news…
        </div>
      ) : items.length > 0 ? (
        <div>
          {items.map((item, index) => (
            <a
              key={`${item.source}-${item.datetime}-${item.headline}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className={`group grid gap-3 border-b border-white/[.07] py-5 ${index === 0 ? 'grid-cols-[104px_minmax(0,1fr)]' : 'grid-cols-[76px_minmax(0,1fr)]'}`}
            >
              <NewsThumbnail src={item.image} ticker={ticker} prominent={index === 0} />

              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-[var(--positive)]">{item.source || 'Market news'}</span>
                  {item.datetime > 0 && <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><Clock3 className="h-3 w-3" />{formatTimeAgo(item.datetime)}</span>}
                  <ExternalLink className="ml-auto h-3 w-3 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h3 className={`${index === 0 ? 'text-[15px]' : 'text-sm'} font-semibold leading-snug text-[#edf0ed] group-hover:text-white`}>
                  {item.headline}
                </h3>
                {item.summary && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">
                    {item.summary}
                  </p>
                )}
              </div>
            </a>
          ))}

          <a
            href={`https://finance.yahoo.com/quote/${ticker}/news/`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white"
          >
            View all news <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <p className="py-8 text-sm leading-6 text-[var(--text-secondary)]">
          No recent company news is available for {ticker} right now.
        </p>
      )}
    </aside>
  );
}
