import { useState, useEffect } from 'react';
import { seedSampleBookings, syncCurrentStationStates } from './db/storage';
import CustomerPanel from './components/CustomerPanel';
import AdminPanel from './components/AdminPanel';
import GamesLibrary from './components/GamesLibrary';
import { Gamepad, Shield, MonitorPlay, Sparkles } from 'lucide-react';

type ViewMode = 'customer' | 'games' | 'admin';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('customer');
  const [initialBookingType, setInitialBookingType] = useState<'PC' | 'PS5' | null>(null);

  // Initialize and seed database on mount
  useEffect(() => {
    seedSampleBookings();
    syncCurrentStationStates();

    // Periodically sync station occupancy status
    const interval = setInterval(() => {
      syncCurrentStationStates();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectGameToBook = (platform: 'PC' | 'PS5') => {
    setInitialBookingType(platform);
    setViewMode('customer');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Ambient background overlay */}
      <div className="matrix-scanline" />

      {/* Main Navbar */}
      <header
        style={{
          background: 'rgba(10, 13, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-muted)',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          position: 'sticky',
          top: 0,
        }}
      >
        <div 
          onClick={() => { setViewMode('customer'); setInitialBookingType(null); }} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div 
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gamepad size={22} color="var(--neon-blue)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, letterSpacing: '0.02em', background: 'none', WebkitTextFillColor: 'initial', color: '#ffffff' }}>
              MATRIX <span style={{ color: 'var(--neon-blue)' }}>GAMING</span>
            </h1>
            <span style={{ fontSize: '0.68rem', color: 'var(--neon-green)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PARLOUR & STORE BOOKING
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setViewMode('customer'); setInitialBookingType(null); }}
            className={`btn ${viewMode === 'customer' ? 'btn-neon-blue' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            <Sparkles size={14} /> Play & Book
          </button>
          <button
            onClick={() => setViewMode('games')}
            className={`btn ${viewMode === 'games' ? 'btn-neon-blue' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            <MonitorPlay size={14} /> Games Catalog
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`btn ${viewMode === 'admin' ? 'btn-neon-purple' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            <Shield size={14} /> Admin
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 16px', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
        {viewMode === 'customer' && (
          <CustomerPanel initialBookingType={initialBookingType} onClearInitialBooking={() => setInitialBookingType(null)} onNavigateToGames={() => setViewMode('games')} />
        )}
        {viewMode === 'games' && (
          <GamesLibrary onSelectGameToBook={handleSelectGameToBook} />
        )}
        {viewMode === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          borderTop: '1px solid var(--border-muted)',
          marginTop: 'auto',
          background: 'rgba(5, 7, 15, 0.9)',
        }}
      >
        <p style={{ margin: 0 }}>
          &copy; {new Date().getFullYear()} Matrix Gaming Parlour. All rights reserved.
        </p>
        <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
          Designed for Gamers &middot; Mobile Friendly &middot; GTA V &middot; EA FC 24 &middot; COD MW III &middot; Cash & UPI Payments
        </p>
      </footer>
    </div>
  );
}

export default App;
