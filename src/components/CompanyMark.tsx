import { useEffect, useState } from 'react';
import { getCompanyMetadata } from '../utils/companyMetadata';

interface CompanyMarkProps {
  ticker: string;
  size?: number;
  className?: string;
}

/** A company's logo on a light tile (so dark logos stay visible), or its initials if there is none. */
export default function CompanyMark({ ticker, size = 26, className = '' }: CompanyMarkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const company = getCompanyMetadata(ticker);
  const symbol = ticker.toUpperCase();

  useEffect(() => setImageFailed(false), [symbol]);

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[6px] bg-ink ${className}`}
    >
      {company.domain && !imageFailed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(company.domain)}&sz=128`}
          alt=""
          className="h-[72%] w-[72%] object-contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="font-mono text-[9px] font-bold tracking-[-.05em] text-canvas">
          {symbol.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
