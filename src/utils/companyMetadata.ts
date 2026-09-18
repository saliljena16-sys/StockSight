export interface CompanyMetadata {
  name: string;
  domain?: string;
}

const COMPANY_METADATA: Record<string, CompanyMetadata> = {
  AAPL: { name: 'Apple Inc.', domain: 'apple.com' },
  MSFT: { name: 'Microsoft Corporation', domain: 'microsoft.com' },
  NVDA: { name: 'NVIDIA Corporation', domain: 'nvidia.com' },
  GOOGL: { name: 'Alphabet Inc.', domain: 'google.com' },
  GOOG: { name: 'Alphabet Inc.', domain: 'google.com' },
  AMZN: { name: 'Amazon.com, Inc.', domain: 'amazon.com' },
  META: { name: 'Meta Platforms, Inc.', domain: 'meta.com' },
  TSLA: { name: 'Tesla, Inc.', domain: 'tesla.com' },
  AMD: { name: 'Advanced Micro Devices, Inc.', domain: 'amd.com' },
  NFLX: { name: 'Netflix, Inc.', domain: 'netflix.com' },
  JPM: { name: 'JPMorgan Chase & Co.', domain: 'jpmorganchase.com' },
  V: { name: 'Visa Inc.', domain: 'visa.com' },
  MA: { name: 'Mastercard Incorporated', domain: 'mastercard.com' },
  JNJ: { name: 'Johnson & Johnson', domain: 'jnj.com' },
  WMT: { name: 'Walmart Inc.', domain: 'walmart.com' },
  PG: { name: 'Procter & Gamble Co.', domain: 'pg.com' },
  DIS: { name: 'The Walt Disney Company', domain: 'thewaltdisneycompany.com' },
  BAC: { name: 'Bank of America Corp.', domain: 'bankofamerica.com' },
  INTC: { name: 'Intel Corporation', domain: 'intel.com' },
  CRM: { name: 'Salesforce, Inc.', domain: 'salesforce.com' },
  PYPL: { name: 'PayPal Holdings, Inc.', domain: 'paypal.com' },
  XOM: { name: 'Exxon Mobil Corporation', domain: 'exxon.com' },
  CVX: { name: 'Chevron Corporation', domain: 'chevron.com' },
  SHEL: { name: 'Shell plc', domain: 'shell.com' },
  SLB: { name: 'SLB', domain: 'slb.com' },
  KO: { name: 'The Coca-Cola Company', domain: 'coca-colacompany.com' },
  PEP: { name: 'PepsiCo, Inc.', domain: 'pepsico.com' },
  UNH: { name: 'UnitedHealth Group', domain: 'unitedhealthgroup.com' },
  IBM: { name: 'IBM', domain: 'ibm.com' },
};

export function getCompanyMetadata(ticker: string, suppliedName?: string): CompanyMetadata {
  const symbol = ticker.toUpperCase();
  const known = COMPANY_METADATA[symbol];
  const hasUsefulSuppliedName = Boolean(suppliedName && suppliedName.trim().toUpperCase() !== symbol);

  return {
    name: hasUsefulSuppliedName ? suppliedName!.trim() : known?.name ?? symbol,
    domain: known?.domain,
  };
}
