import { useState } from 'react';
import { STARTER_STOCKS } from './utils/mockData';
import { calculatePortfolioSummary, calculateSectorAllocation } from './utils/portfolioMetrics';
import { scrollToTop } from './utils/scroll';
import type { PrimaryView } from './types/views';
import { usePortfolioState } from './hooks/usePortfolioState';
import { useStockQuotes } from './hooks/useStockQuotes';
import { useSectorFilter } from './hooks/useSectorFilter';
import { useAuthSync } from './hooks/useAuthSync';
import { useStockNews } from './hooks/useStockNews';
import { useSymbolSearch } from './hooks/useSymbolSearch';
import { useWatchlistView } from './hooks/useWatchlistView';
import AppHeader from './components/layout/AppHeader';
import MobileTabBar from './components/layout/MobileTabBar';
import NoticeBanner from './components/layout/NoticeBanner';
import AppFooter from './components/layout/AppFooter';
import PortfolioHero from './components/portfolio/PortfolioHero';
import HoldingsList from './components/portfolio/HoldingsList';
import AddHoldingModal from './components/portfolio/AddHoldingModal';
import PortfolioSkeleton from './components/portfolio/PortfolioSkeleton';
import EmptyPortfolio from './components/portfolio/EmptyPortfolio';
import WatchlistTable from './components/watchlist/WatchlistTable';
import StockDetailPanel from './components/detail/StockDetailPanel';
import PrimaryWorkspace from './components/PrimaryWorkspace';
import AuthModal from './components/AuthModal';
import HoldingModal from './components/HoldingModal';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { removeStockWarning } from './utils/portfolioState';

/**
 * App shell: connects the state hooks to the header, the portfolio screen (hero, holdings list,
 * stock detail panel, tables), the Insights and News views, and the dialogs.
 */
export default function App() {
  const [primaryView, setPrimaryView] = useState<PrimaryView>('portfolio');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [removingTicker, setRemovingTicker] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view = useWatchlistView();

  const {
    selectedTicker,
    setSelectedTicker,
    portfolios,
    activePortfolio,
    setActivePortfolio,
    activeTickers,
    portfolioQuantities,
    portfolioAverageCosts,
    portfolioCash,
    portfolioTransactions,
    applyPortfolioState,
    addStock,
    removeStock,
    saveHolding,
    setCashBalance,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
  } = usePortfolioState();
  const { stocksData, isLoading, lastUpdate, isRefreshing, refresh, hasLiveData, allLiveData } = useStockQuotes(activeTickers);
  const { sectorFilter, setSectorFilter, filteredStocks, availableSectors } = useSectorFilter(stocksData);
  const { userEmail, signIn, resendConfirmation, signOut } = useAuthSync({
    portfolios,
    quantities: portfolioQuantities,
    averageCosts: portfolioAverageCosts,
    cash: portfolioCash,
    transactions: portfolioTransactions,
    applyPortfolioState,
    onNotice: setNotice,
  });

  const selectedStock = stocksData?.find(s => s.ticker === selectedTicker);
  const { stockNews, newsLoading } = useStockNews(selectedStock?.ticker);
  const search = useSymbolSearch({ activeTickers, onSelect: setSelectedTicker, onAdd: addStock });

  const quantities = portfolioQuantities[activePortfolio];
  const averageCosts = portfolioAverageCosts[activePortfolio];
  const summary = calculatePortfolioSummary(stocksData ?? [], quantities, averageCosts, portfolioCash[activePortfolio]);
  const sectorAllocation = calculateSectorAllocation(summary.holdingStocks, quantities);
  const hasHoldings = Object.values(quantities ?? {}).some(quantity => quantity > 0);
  // Tickers are listed but their quotes have not arrived yet.
  const quotesLoading = !stocksData && activeTickers.length > 0;

  const navigate = (next: PrimaryView) => {
    setPrimaryView(next);
    scrollToTop();
  };

  /** Jump from another view to a stock's price chart on the portfolio screen. */
  const inspectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    setPrimaryView('portfolio');
    view.setActiveTab('chart');
    scrollToTop();
  };

  const addHolding = (ticker: string, quantity: number, averageCost: number) => {
    saveHolding(ticker, quantity, averageCost);
    setNotice(`${ticker} added to your holdings.`);
  };

  // Removing a stock also deletes its shares and average cost, so ask first when it has shares.
  const requestRemoveStock = (ticker: string) => {
    if (removeStockWarning(quantities?.[ticker], averageCosts?.[ticker])) setRemovingTicker(ticker);
    else removeStock(ticker);
  };
  const removeWarning = removingTicker ? removeStockWarning(quantities?.[removingTicker], averageCosts?.[removingTicker]) : null;

  const loadSampleWatchlist = () => {
    STARTER_STOCKS.forEach(addStock);
    setSelectedTicker(STARTER_STOCKS[0]);
  };

  return (
    <div className="relative isolate min-h-screen">
      <div className="app-backdrop" aria-hidden="true" />
      <AppHeader
        primaryView={primaryView}
        onNavigate={navigate}
        searchQuery={search.query}
        onSearchChange={search.setQuery}
        onSearchSubmit={search.submit}
        searchInputRef={search.inputRef}
        hasQuotes={Boolean(stocksData)}
        hasLiveData={hasLiveData}
        allLiveData={allLiveData}
        isLoading={isLoading}
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        userEmail={userEmail}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={signOut}
      />

      <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {primaryView === 'portfolio' ? (
          <>
            <PortfolioHero
              portfolioNames={Object.keys(portfolios)}
              activePortfolio={activePortfolio}
              onSelectPortfolio={setActivePortfolio}
              onCreate={createPortfolio}
              onRename={renamePortfolio}
              onDelete={deletePortfolio}
              summary={summary}
              loading={quotesLoading}
              hasHoldings={hasHoldings}
              watchedCount={activeTickers.length}
              hasSimulatedPrices={Boolean(stocksData) && !allLiveData}
              signedIn={Boolean(userEmail)}
              onAddHolding={() => setShowAddModal(true)}
              onLoadSample={loadSampleWatchlist}
            />

            {quotesLoading && <PortfolioSkeleton rows={activeTickers.length} />}
            {activeTickers.length === 0 && <EmptyPortfolio />}

            {stocksData && (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[420px_minmax(0,1fr)]">
                  <HoldingsList
                    stocks={stocksData}
                    quantities={quantities}
                    selectedTicker={selectedTicker}
                    onSelect={setSelectedTicker}
                    onEditHolding={setEditingTicker}
                    className="lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)]"
                  />
                  {selectedStock && (
                    <StockDetailPanel
                      selectedStock={selectedStock}
                      stocks={stocksData}
                      quantity={quantities?.[selectedStock.ticker] ?? 0}
                      averageCost={averageCosts?.[selectedStock.ticker]}
                      activeTab={view.activeTab}
                      onTabChange={view.setActiveTab}
                      stockNews={stockNews}
                      newsLoading={newsLoading}
                      onEditHolding={setEditingTicker}
                      canRemove={activeTickers.length > 1}
                      onRemove={requestRemoveStock}
                    />
                  )}
                </div>

                <WatchlistTable
                  tableTab={view.tableTab}
                  onSelectTab={view.setTableTab}
                  stocks={stocksData}
                  filteredStocks={filteredStocks}
                  sectorFilter={sectorFilter}
                  availableSectors={availableSectors}
                  onSectorChange={setSectorFilter}
                  onAddHolding={() => setShowAddModal(true)}
                  summary={summary}
                  sectorAllocation={sectorAllocation}
                  transactions={portfolioTransactions[activePortfolio]}
                  quantities={quantities}
                  averageCosts={averageCosts}
                  selectedTicker={selectedTicker}
                  onSelect={setSelectedTicker}
                  onEditHolding={setEditingTicker}
                  onCashChange={setCashBalance}
                />
              </>
            )}
          </>
        ) : (
          <PrimaryWorkspace
            view={primaryView}
            stocks={stocksData ?? []}
            loading={quotesLoading}
            quantities={quantities ?? {}}
            totalValue={summary.totalPortfolioValue}
            cash={summary.cashBalance}
            onInspect={inspectStock}
          />
        )}
      </main>

      <AppFooter showDemoNote={!hasLiveData && Boolean(stocksData)} />
      <MobileTabBar primaryView={primaryView} onNavigate={navigate} />
      {notice && <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />}

      <AddHoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        watchlist={activeTickers.map(ticker => ({
          ticker,
          quantity: quantities?.[ticker] ?? 0,
          averageCost: averageCosts?.[ticker],
          price: stocksData?.find(stock => stock.ticker === ticker)?.currentPrice,
        }))}
        onSaveHolding={addHolding}
        onWatch={addStock}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSubmit={signIn} onResend={resendConfirmation} />
      <HoldingModal
        ticker={editingTicker}
        initialQuantity={editingTicker ? (quantities?.[editingTicker] ?? 0) : 0}
        initialAverageCost={editingTicker ? (averageCosts?.[editingTicker] ?? stocksData?.find(stock => stock.ticker === editingTicker)?.currentPrice ?? 0) : 0}
        onClose={() => setEditingTicker(null)}
        onSave={(quantity, averageCost) => {
          if (!editingTicker) return;
          saveHolding(editingTicker, quantity, averageCost);
          setNotice(`${editingTicker} holding updated.`);
        }}
      />
      {removingTicker && removeWarning && (
        <ConfirmDialog
          titleId="remove-stock-title"
          title={`Remove ${removingTicker}?`}
          message={removeWarning}
          confirmLabel="Remove stock"
          onConfirm={() => removeStock(removingTicker)}
          onClose={() => setRemovingTicker(null)}
        />
      )}
    </div>
  );
}
