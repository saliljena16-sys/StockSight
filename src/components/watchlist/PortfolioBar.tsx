import { Pencil, Plus, Trash2 } from 'lucide-react';

interface PortfolioBarProps {
  portfolioNames: string[];
  activePortfolio: string;
  onSelectPortfolio: (name: string) => void;
  holdingsCount: number;
  totalPortfolioValue: number;
  onCreate: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
}

/** Active portfolio name and value, the portfolio switcher, and rename/delete/create actions. */
export default function PortfolioBar({
  portfolioNames,
  activePortfolio,
  onSelectPortfolio,
  holdingsCount,
  totalPortfolioValue,
  onCreate,
  onRename,
  onDelete,
}: PortfolioBarProps) {
  const handleCreatePortfolio = () => {
    const nextName = window.prompt('Create a portfolio name', `Portfolio ${portfolioNames.length + 1}`);
    if (!nextName || !nextName.trim()) return;
    onCreate(nextName.trim());
  };

  const handleRenamePortfolio = () => {
    const currentName = activePortfolio;
    const nextName = window.prompt('Rename portfolio', currentName);
    if (!nextName || !nextName.trim()) return;

    const cleaned = nextName.trim();
    if (cleaned === currentName) return;
    onRename(currentName, cleaned);
  };

  const handleDeletePortfolio = () => {
    if (portfolioNames.length <= 1) {
      window.alert('You must keep at least one portfolio.');
      return;
    }

    const confirmed = window.confirm(`Delete the portfolio "${activePortfolio}"?`);
    if (!confirmed) return;
    onDelete(activePortfolio);
  };

  return (
    <section className="border-b border-white/[.08] bg-[#0b1011]/75">
      <div className="mx-auto flex min-h-[92px] w-[calc(100%-24px)] max-w-[1680px] flex-col justify-center gap-3 py-4 sm:w-[calc(100%-32px)] md:min-h-[104px] md:flex-row md:items-center md:justify-between md:gap-4 md:py-5 xl:w-[calc(100%-48px)]">
        <div className="flex items-stretch gap-4">
          <span className="w-[3px] rounded-full bg-lime-300/80" />
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-.035em] text-white">{activePortfolio}</h2>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {holdingsCount} holdings <span className="mx-1 text-[var(--text-tertiary)]">•</span> <span className="font-mono">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        <div className="mobile-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {portfolioNames.length > 1 && portfolioNames.map((portfolio) => (
            <button
              key={portfolio}
              onClick={() => onSelectPortfolio(portfolio)}
              className={`min-h-10 whitespace-nowrap rounded-[7px] px-3 text-sm ${
                activePortfolio === portfolio
                  ? 'bg-white/[.07] text-white'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {portfolio}
            </button>
          ))}
          <button
            onClick={handleRenamePortfolio}
            aria-label="Rename portfolio"
            title="Rename portfolio"
            className="inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-white/[.1] px-4 text-sm text-[var(--text-secondary)] hover:bg-white/[.04] hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Rename</span>
          </button>
          <button
            onClick={handleDeletePortfolio}
            disabled={portfolioNames.length <= 1}
            aria-label="Delete portfolio"
            title="Delete portfolio"
            className="inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-red-400/20 bg-red-400/[.03] px-4 text-sm text-red-300/80 hover:bg-red-400/[.07] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Delete</span>
          </button>
          <button
            onClick={handleCreatePortfolio}
            aria-label="Create portfolio"
            title="Create portfolio"
            className="min-h-10 whitespace-nowrap rounded-[7px] border border-white/[.1] px-4 text-sm text-white hover:bg-white/[.05]"
          >
            <Plus className="inline h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">New Portfolio</span>
          </button>
        </div>
      </div>
    </section>
  );
}
