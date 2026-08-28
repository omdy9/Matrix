import { useState, useEffect } from 'react';
import { seedSampleBookings, syncCurrentStationStates } from './db/storage';
import CustomerPanel from './components/CustomerPanel';
import AdminPanel from './components/AdminPanel';
import { Gamepad, Shield } from 'lucide-react';

type ViewMode = 'customer' | 'admin';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('customer');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Laser Scanline */}
      <div className="matrix-scanline" />

      {/* Main Premium Navbar */}
      <header
        className="glass-card"
        style={{
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          position: 'sticky',
          top: 0,
        }}
      >
        <div 
          onClick={() => setViewMode('customer')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
            }}
          >
            <Gamepad size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, letterSpacing: '0.1em' }}>MATRIX GAMING</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              PARLOUR BOOKING
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setViewMode('customer')}
            className={`btn ${viewMode === 'customer' ? 'btn-neon-blue' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}
          >
            Play & Book
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`btn ${viewMode === 'admin' ? 'btn-neon-purple' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Shield size={16} /> Admin
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 16px', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
        {viewMode === 'customer' ? (
          <CustomerPanel />
        ) : (
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
          Designed for Gamers &middot; Mobile Friendly &middot; Cash & UPI Payments
        </p>
      </footer>
    </div>
  );
}

export default App;
