import React, { useEffect, useState } from 'react';
import { CardDetailModal } from './components/CardDetailModal';
import { CatalogValidationModal } from './components/CatalogValidationModal';
import { CatalogView } from './components/CatalogView';
import { Dashboard } from './components/Dashboard';
import { DeckBuilder } from './components/DeckBuilder';
import { DuplicatesView } from './components/DuplicatesView';
import { ExpansionsView } from './components/ExpansionsView';
import { FavoritesView } from './components/FavoritesView';
import { ActiveTab, Header } from './components/Header';
import { MissingView } from './components/MissingView';
import { MobileNav } from './components/MobileNav';
import { MyCollection } from './components/MyCollection';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { VirtualBinder } from './components/VirtualBinder';
import { PlaytestArena } from './components/PlaytestArena';
import { CardProvider } from './services/cardProvider';
import { SetSyncService } from './services/setSyncService';
import { StorageService } from './services/storage';
import { SyncService } from './services/sync/SyncService';
import { AuthService } from './services/sync/AuthService';
import { AICoach } from './components/AICoach';
import { MarketView } from './components/market/MarketView';
import { TradeManagerView } from './components/trades/TradeManagerView';
import { WishlistView } from './components/wishlist/WishlistView';
import { CollectionTimeline } from './components/timeline/CollectionTimeline';
import { CardLanguage, CardVariant, PokemonCard } from './types';
import { useGlobalState } from './context/GlobalStateContext';
import { BattleWrapper } from './components/battle/BattleWrapper';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [selectedCardVariant, setSelectedCardVariant] = useState<CardVariant | undefined>(undefined);
  const [collectionVersion, setCollectionVersion] = useState(0);

  // Central state variables and setters
  const { theme, setTheme, preferredLanguage, setPreferredLanguage } = useGlobalState();

  // Binder Set Selection
  const [binderSetId, setBinderSetId] = useState<string>('sv03.5');

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Initialize IndexedDB & localStorage migration on startup
  useEffect(() => {
    StorageService.init().catch((err) => {
      console.warn('StorageService.init failed:', err);
    });
    const user = AuthService.getCurrentUser();
    if (user) {
      SyncService.syncNow().catch(() => {});
    }
  }, []);

  useEffect(() => {
    CardProvider.setDefaultLanguage(preferredLanguage);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferredLanguage, theme]);

  // Background Auto-Sync & periodic check on startup
  useEffect(() => {
    SetSyncService.startPeriodicSync(preferredLanguage);
    return () => {
      SetSyncService.stopPeriodicSync();
    };
  }, [preferredLanguage]);

  // Register PWA Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed', err);
      });
    }
  }, []);

  const handleNavigate = (tab: ActiveTab, params?: any) => {
    setActiveTab(tab);
    if (params?.setId) {
      setBinderSetId(params.setId);
    }
  };

  return (
    <div
      className={`h-screen w-full flex flex-col font-sans transition-colors duration-300 overflow-hidden ${
        theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
      }`}
      style={{ backgroundColor: theme === 'dark' ? '#0b0f19' : '#f8f9fa' }}
    >
      {/* Interactive & Immersive Pokémon Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Soft atmospheric gradient glows based on theme */}
        <div className={`absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-[0.12] transition-all duration-1000 ${
          theme === 'dark' ? 'bg-red-500' : 'bg-red-300'
        }`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-[0.1] transition-all duration-1000 ${
          theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-200'
        }`} />
        <div className={`absolute top-[30%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-[0.08] transition-all duration-1000 ${
          theme === 'dark' ? 'bg-sky-500' : 'bg-sky-200'
        }`} />

        {/* Huge, extremely faint background rotating Pokéball */}
        <div className={`absolute right-[-10%] bottom-[-5%] w-[500px] h-[500px] transition-all duration-500 pointer-events-none ${
          theme === 'dark' ? 'text-slate-800/10' : 'text-slate-300/15'
        }`}>
          <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full animate-[spin_120s_linear_infinite]">
            <path d="M 50 0 A 50 50 0 0 0 0 50 L 35 50 A 15 15 0 0 1 50 35 L 50 0 Z M 50 0 L 50 35 A 15 15 0 0 1 65 50 L 100 50 A 50 50 0 0 0 50 0 Z M 0 50 A 50 50 0 0 0 50 100 L 50 65 A 15 15 0 0 1 35 50 L 0 50 Z M 50 100 A 50 50 0 0 0 100 50 L 65 50 A 15 15 0 0 1 50 65 L 50 100 Z M 50 40 A 10 10 0 1 0 50 60 A 10 10 0 1 0 50 40 Z" />
          </svg>
        </div>

        {/* Small floating energy card particle highlights */}
        <div className="absolute inset-0 flex justify-around items-center opacity-[0.15]">
          <span className="text-4xl animate-bounce" style={{ animationDuration: '8s', animationDelay: '0.5s' }}>⚡</span>
          <span className="text-3xl animate-bounce" style={{ animationDuration: '10s', animationDelay: '2s' }}>🔥</span>
          <span className="text-5xl animate-bounce" style={{ animationDuration: '12s', animationDelay: '4s' }}>💧</span>
          <span className="text-4xl animate-bounce" style={{ animationDuration: '9s', animationDelay: '1.5s' }}>🌿</span>
          <span className="text-3xl animate-bounce" style={{ animationDuration: '11s', animationDelay: '3s' }}>🔮</span>
        </div>
      </div>

      {/* Header Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={theme}
        setTheme={setTheme}
        preferredLanguage={preferredLanguage}
        setPreferredLanguage={setPreferredLanguage}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAdmin={() => setShowAdmin(true)}
      />

      {/* Main Container with Sidebar + Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sleek Desktop Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Scroll View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-7 max-w-[1540px] mx-auto w-full pb-24 lg:pb-14">
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigate={handleNavigate}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogView
              preferredLanguage={preferredLanguage}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'binder' && (
            <VirtualBinder
              preferredLanguage={preferredLanguage}
              initialSetId={binderSetId}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'collection' && (
            <MyCollection
              preferredLanguage={preferredLanguage}
              collectionVersion={collectionVersion}
              onSelectCard={(c, variant) => {
                setSelectedCard(c);
                setSelectedCardVariant(variant);
              }}
              onNavigateToCatalog={() => setActiveTab('catalog')}
            />
          )}

          {activeTab === 'expansions' && (
            <ExpansionsView
              preferredLanguage={preferredLanguage}
              onOpenBinderForSet={(setId) => handleNavigate('binder', { setId })}
            />
          )}

          {activeTab === 'decks' && (
            <DeckBuilder
              preferredLanguage={preferredLanguage}
              onSelectCard={(c) => setSelectedCard(c)}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'arena' && (
            <BattleWrapper />
          )}

          {activeTab === 'duplicates' && (
            <DuplicatesView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'missing' && (
            <MissingView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'ai-coach' && (
            <AICoach
              preferredLanguage={preferredLanguage}
              onSelectCard={(c) => setSelectedCard(c)}
            />
          )}

          {activeTab === 'market' && (
            <MarketView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c, v) => {
                setSelectedCard(c);
                setSelectedCardVariant(v);
              }}
            />
          )}

          {activeTab === 'trades' && (
            <TradeManagerView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c, v) => {
                setSelectedCard(c);
                setSelectedCardVariant(v);
              }}
            />
          )}

          {activeTab === 'wishlist' && (
            <WishlistView
              preferredLanguage={preferredLanguage}
              onSelectCard={(c, v) => {
                setSelectedCard(c);
                setSelectedCardVariant(v);
              }}
              onNavigateToCatalog={() => setActiveTab('catalog')}
            />
          )}

          {activeTab === 'timeline' && (
            <CollectionTimeline />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Card Detail & Collection Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          initialVariant={selectedCardVariant}
          onClose={() => {
            setSelectedCard(null);
            setSelectedCardVariant(undefined);
          }}
          preferredLanguage={preferredLanguage}
          onCollectionUpdated={() => {
            setCollectionVersion((v) => v + 1);
          }}
        />
      )}

      {/* Settings & Backup Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          preferredLanguage={preferredLanguage}
          setPreferredLanguage={setPreferredLanguage}
          theme={theme}
          setTheme={setTheme}
          onDataRestored={() => window.location.reload()}
          onOpenDiagnostic={() => setShowAdmin(true)}
        />
      )}

      {/* Catalog Integrity Diagnostic Modal (Admin) */}
      {showAdmin && (
        <CatalogValidationModal
          onClose={() => setShowAdmin(false)}
          preferredLanguage={preferredLanguage}
        />
      )}
    </div>
  );
}
