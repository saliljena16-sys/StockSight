import { useState } from 'react';
import { calculatePortfolioSummary, calculateSectorAllocation } from './utils/portfolioMetrics';
import type { PrimaryView } from './types/views';
import { usePortfolioState } from './hooks/usePortfolioState';
import { useStockQuotes } from './hooks/useStockQuotes';
import { useSectorFilter } from './hooks/useSectorFilter';
import { useAuthSync } from './hooks/useAuthSync';
import { useStockNews } from './hooks/useStockNews';
import { useSymbolSearch } from './hooks/useSymbolSearch';
import { useWatchlistView } from './hooks/useWatchlistView';
import AppHeader from './components/layout/AppHeader';
import MobilePrimaryNav from './components/layout/MobilePrimaryNav';
import MobileSearchBar from './components/layout/MobileSearchBar';
import NoticeBanner from './components/layout/NoticeBanner';
import AppFooter from './components/layout/AppFooter';
import PortfolioBar from './components/watchlist/PortfolioBar';
import WatchlistLoading from './components/watchlist/WatchlistLoading';
import WatchlistToolbar from './components/watchlist/WatchlistToolbar';
import WatchlistTable from './components/watchlist/WatchlistTable';
import WatchlistCards from './components/watchlist/WatchlistCards';
import StockDetailPanel from './components/detail/StockDetailPanel';
import PrimaryWorkspace from './components/PrimaryWorkspace';
import AddStockModal from './components/AddStockModal';
import AuthModal from './components/AuthModal';
import HoldingModal from './components/HoldingModal';

/**
 * App shell: connects the state hooks to the header, the primary views, the watchlist (cards or
 * table), the selected-stock detail panel, and the modals.
 */
export default function App() {
  const [primaryView, setPrimaryView] = useState<PrimaryView>('watchlist');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
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

  const summary = calculatePortfolioSummary(stocksData ?? [], portfolioQuantities[activePortfolio], portfolioAverageCosts[activePortfolio], portfolioCash[activePortfolio]);
  const sectorAllocation = calculateSectorAllocation(summary.holdingStocks, portfolioQuantities[activePortfolio]);

  /** Jump from another view to a stock's price chart in the watchlist. */
  const inspectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    setPrimaryView('watchlist');
    view.setActiveTab('chart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f3f5f2]">
      <AppHeader
        primaryView={primaryView}
        onNavigate={setPrimaryView}
        searchQuery={search.query}
        onSearchChange={search.setQuery}
        onSearchSubmit={search.submit}
        searchInputRef={search.desktopInputRef}
        hasLiveData={hasLiveData}
        allLiveData={allLiveData}
        isLoading={isLoading}
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        userEmail={userEmail}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={signOut}
        onAddStock={() => setShowAddModal(true)}
      />

      <MobilePrimaryNav primaryView={primaryView} onNavigate={setPrimaryView} />

      <MobileSearchBar value={search.query} onChange={search.setQuery} onSubmit={search.submit} inputRef={search.mobileInputRef} />

      {primaryView === 'watchlist' && (
        <PortfolioBar
          portfolioNames={Object.keys(portfolios)}
          activePortfolio={activePortfolio}
          onSelectPortfolio={setActivePortfolio}
          holdingsCount={summary.holdingStocks.length}
          totalPortfolioValue={summary.totalPortfolioValue}
          onCreate={createPortfolio}
          onRename={renamePortfolio}
          onDelete={deletePortfolio}
        />
      )}

      {/* Main Content */}
      <main className="mx-auto min-w-0 w-[calc(100%-24px)] max-w-[1680px] py-4 sm:w-[calc(100%-32px)] sm:py-6 xl:w-[calc(100%-48px)]">
        {notice && <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />}
        {primaryView !== 'watchlist' && (
          <PrimaryWorkspace
            view={primaryView}
            stocks={stocksData ?? []}
            quantities={portfolioQuantities[activePortfolio] ?? {}}
            totalValue={summary.totalPortfolioValue}
            cash={summary.cashBalance}
            onInspect={inspectStock}
          />
        )}
        {primaryView === 'watchlist' && isLoading && !stocksData && <WatchlistLoading />}

        {primaryView === 'watchlist' && stocksData && (
          <WatchlistToolbar
            viewMode={view.viewMode}
            tableTab={view.tableTab}
            onSelectTableTab={view.showTableTab}
            onShowCards={view.showCards}
            onShowTable={view.showTable}
          />
        )}

        {primaryView === 'watchlist' && stocksData && view.viewMode === 'table' && (
          <WatchlistTable
            tableTab={view.tableTab}
            stocks={stocksData}
            filteredStocks={filteredStocks}
            sectorFilter={sectorFilter}
            availableSectors={availableSectors}
            onSectorChange={setSectorFilter}
            onAddTickers={() => setShowAddModal(true)}
            summary={summary}
            sectorAllocation={sectorAllocation}
            transactions={portfolioTransactions[activePortfolio]}
            quantities={portfolioQuantities[activePortfolio]}
            averageCosts={portfolioAverageCosts[activePortfolio]}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onEditHolding={setEditingTicker}
            onCashChange={setCashBalance}
          />
        )}

        {primaryView === 'watchlist' && stocksData && view.viewMode === 'cards' && (
          <WatchlistCards
            stocks={stocksData}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            canRemove={activeTickers.length > 1}
            onRemove={removeStock}
            onAddSymbol={() => setShowAddModal(true)}
          />
        )}

        {primaryView === 'watchlist' && selectedStock && (
          <StockDetailPanel
            selectedStock={selectedStock}
            stocks={stocksData ?? []}
            activeTab={view.activeTab}
            onTabChange={view.setActiveTab}
            stockNews={stockNews}
            newsLoading={newsLoading}
          />
        )}
      </main>

      <AppFooter showDemoNote={!hasLiveData && Boolean(stocksData)} />

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addStock}
        existingTickers={activeTickers}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSubmit={signIn} onResend={resendConfirmation} />
      <HoldingModal
        ticker={editingTicker}
        initialQuantity={editingTicker ? (portfolioQuantities[activePortfolio]?.[editingTicker] ?? 0) : 0}
        initialAverageCost={editingTicker ? (portfolioAverageCosts[activePortfolio]?.[editingTicker] ?? stocksData?.find(stock => stock.ticker === editingTicker)?.currentPrice ?? 0) : 0}
        onClose={() => setEditingTicker(null)}
        onSave={(quantity, averageCost) => {
          if (!editingTicker) return;
          saveHolding(editingTicker, quantity, averageCost);
          setNotice(`${editingTicker} holding updated.`);
        }}
      />
    </div>
  );
}
