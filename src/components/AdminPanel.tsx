import { useState, useEffect } from 'react';
import {
  getStations,
  getBookings,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
  markAsNoShow,
  extendOrSwapStation,
  createBooking,
  formatRupees,
  syncCurrentStationStates,
  calculateEndTime,
  getEffectiveSessionTiming,
  updateCheckInTime,
} from '../db/storage';
import type { Booking, Station, PaymentMethod, EffectiveSessionTiming } from '../db/storage';
import {
  Shield,
  Search,
  Plus,
  Play,
  Check,
  RefreshCw,
  LogOut,
  Sliders,
  CreditCard,
  Clock,
  Gamepad,
  Laptop,
  AlertTriangle,
  Edit3,
  Info,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import StationConfig from './StationConfig';
import AnalyticsView from './AnalyticsView';

const PASSCODE = '1337';

const DURATION_OPTIONS = [
  { label: '15m',   hours: 0.25 },
  { label: '30m',   hours: 0.5 },
  { label: '45m',   hours: 0.75 },
  { label: '1h',    hours: 1 },
  { label: '1h 15m',hours: 1.25 },
  { label: '1h 30m',hours: 1.5 },
  { label: '2h',    hours: 2 },
  { label: '2h 30m',hours: 2.5 },
  { label: '3h',    hours: 3 },
  { label: '4h',    hours: 4 },
];

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatLiveTimer(startISO: string, now: Date): { text: string; totalSeconds: number } {
  const startMs = new Date(startISO).getTime();
  const diffMs = Math.max(0, now.getTime() - startMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    text: hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`,
    totalSeconds,
  };
}

function DualTimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [h, m] = value.split(':').map(Number);
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="time-picker-row">
        <select className="form-control" value={h} onChange={e => onChange(`${String(e.target.value).padStart(2,'0')}:${String(m).padStart(2,'0')}`)}>
          {Array.from({ length: 14 }, (_, i) => 10 + i).map(hr => (
            <option key={hr} value={hr}>{String(hr).padStart(2,'0')} {hr < 12 ? 'AM' : 'PM'}</option>
          ))}
        </select>
        <span className="time-picker-separator">:</span>
        <select className="form-control" value={m} onChange={e => onChange(`${String(h).padStart(2,'0')}:${String(e.target.value).padStart(2,'0')}`)}>
          {[0, 15, 30, 45].map(min => (
            <option key={min} value={min}>{String(min).padStart(2,'0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DurationChips({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="form-group">
      <label className="form-label"><Clock size={12} /> Duration</label>
      <div className="duration-chips">
        {DURATION_OPTIONS.map(opt => (
          <button key={opt.hours} type="button"
            onClick={() => onChange(opt.hours)}
            className={`duration-chip${value === opt.hours ? ' selected' : ''}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeVal, setPasscodeVal] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stations' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [stationsList, setStationsList] = useState<Station[]>([]);

  // Ticking time state for live session clocks
  const [nowTick, setNowTick] = useState<Date>(new Date());

  // Modal states
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<Booking | null>(null);
  const [showExtendModal, setShowExtendModal] = useState<Booking | null>(null);
  const [showCheckInEditModal, setShowCheckInEditModal] = useState<Booking | null>(null);
  const [editCheckInTimeVal, setEditCheckInTimeVal] = useState('17:00');

  // Walk-in form
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wType, setWType] = useState<'PC' | 'PS5'>('PC');
  const [wStationId, setWStationId] = useState('');
  const [wDuration, setWDuration] = useState(1);
  const [wNotes, setWNotes] = useState('');
  const [wControllers, setWControllers] = useState(1);
  const [wStartTime, setWStartTime] = useState('');
  const [wError, setWError] = useState('');

  // Checkout form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [customFinalAmount, setCustomFinalAmount] = useState('');

  // Extend/swap form
  const [extendStationId, setExtendStationId] = useState('');
  const [extendDuration, setExtendDuration] = useState(1);
  const [extendControllers, setExtendControllers] = useState(1);
  const [extendError, setExtendError] = useState('');

  const refreshData = () => {
    syncCurrentStationStates();
    setBookingsList(getBookings());
    setStationsList(getStations());
  };

  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated]);

  // 1-second interval ticker for live session timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 30-second data sync interval
  useEffect(() => {
    const timer = setInterval(refreshData, 30000);
    return () => clearInterval(timer);
  }, []);

  // Initialise walk-in start time to now
  useEffect(() => {
    if (showWalkInModal) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = now.getMinutes() < 30 ? '00' : '30';
      setWStartTime(`${h}:${m}`);
    }
  }, [showWalkInModal]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeVal === PASSCODE) { setIsAuthenticated(true); setAuthError(''); }
    else setAuthError('Access Denied. Invalid admin passcode.');
  };

  const handleCheckIn = (id: string, customTime?: string) => {
    const res = checkInBooking(id, customTime);
    if (typeof res === 'string') alert(res);
    else refreshData();
  };

  const handleNoShow = (id: string) => {
    if (window.confirm('Mark as No Show?')) {
      const res = markAsNoShow(id);
      if (typeof res === 'string') alert(res);
      else refreshData();
    }
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Cancel this booking?')) {
      const res = cancelBooking(id);
      if (typeof res === 'string') alert(res);
      else refreshData();
    }
  };

  const handleSaveCheckInCorrection = () => {
    if (!showCheckInEditModal) return;
    const [h, m] = editCheckInTimeVal.split(':').map(Number);
    const newDate = new Date(`${showCheckInEditModal.bookingDate}T00:00:00`);
    newDate.setHours(h, m, 0, 0);

    const res = updateCheckInTime(showCheckInEditModal.id, newDate.toISOString());
    if (typeof res === 'string') alert(res);
    else {
      alert('Check-In time updated successfully!');
      setShowCheckInEditModal(null);
      refreshData();
    }
  };

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    setWError('');
    if (!wStationId) { setWError('Select an available station.'); return; }
    const today = new Date().toISOString().split('T')[0];

    const bResult = createBooking({
      customerName: wName || 'Walk-In Player',
      customerPhone: wPhone || '9999999999',
      stationId: wStationId,
      bookingDate: today,
      startTime: wStartTime,
      durationHours: wDuration,
      notes: wNotes || 'Walk-in booking',
      numControllers: wType === 'PS5' ? wControllers : 1,
    });

    if (typeof bResult === 'string') { setWError(bResult); return; }

    const ciResult = checkInBooking(bResult.id);
    if (typeof ciResult === 'string') { setWError(ciResult); }
    else {
      setWName(''); setWPhone(''); setWNotes('');
      setShowWalkInModal(false);
      refreshData();
    }
  };

  const handleConfirmCheckout = () => {
    if (!showCheckoutModal) return;
    const amountOverride = customFinalAmount ? Number(customFinalAmount) : undefined;
    const res = checkOutBooking(showCheckoutModal.id, paymentMethod, amountOverride);
    if (typeof res === 'string') alert(res);
    else { setShowCheckoutModal(null); setCustomFinalAmount(''); refreshData(); }
  };

  const openExtensionModal = (booking: Booking) => {
    setShowExtendModal(booking);
    setExtendStationId(booking.stationId);
    setExtendDuration(1);
    setExtendControllers(booking.numControllers || 1);
    setExtendError('');
  };

  const handleConfirmExtension = () => {
    if (!showExtendModal) return;
    setExtendError('');
    const res = extendOrSwapStation(showExtendModal.id, extendStationId, extendDuration, extendControllers);
    if (typeof res === 'string') setExtendError(res);
    else { setShowExtendModal(null); refreshData(); }
  };

  // Categorize active bookings for Live Sessions & Alerting
  const today = new Date().toISOString().split('T')[0];
  const checkedInBookings = bookingsList.filter(b => b.status === 'Checked In');

  // Overdue sessions (checked-in, and now > scheduled end time)
  const overdueBookings = checkedInBookings.filter(b => {
    const schedEnd = new Date(`${b.bookingDate}T${b.scheduledEndTime}:00`);
    return nowTick > schedEnd;
  });

  // Upcoming bookings requiring check-in (confirmed, today, start time <= now + 15 mins)
  const upcomingBookingsRequiringCheckIn = bookingsList.filter(b => {
    if (b.status !== 'Confirmed' || b.bookingDate !== today) return false;
    const schedStart = new Date(`${b.bookingDate}T${b.startTime}:00`);
    return nowTick.getTime() >= schedStart.getTime() - 15 * 60 * 1000;
  });

  // Statistics
  const todayBookings = bookingsList.filter(b => b.bookingDate === today);
  const todayRevenue = bookingsList
    .filter(b => b.bookingDate === today && b.status === 'Completed' && b.finalAmount !== null)
    .reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  const availableStationsCount = stationsList.filter(s => s.status === 'Available').length;

  const filteredBookings = bookingsList.filter(b => {
    const q = searchTerm.toLowerCase();
    const match = b.customerName.toLowerCase().includes(q) || b.customerPhone.includes(q) || b.id.toLowerCase().includes(q);
    if (!match) return false;
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  // ── LOGIN WALL ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', width: '100%' }} className="glass-card border-glow-purple">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(189,0,255,0.1)', padding: '12px', borderRadius: '50%', color: 'var(--neon-purple)', boxShadow: '0 0 15px rgba(189,0,255,0.3)', marginBottom: '12px' }}>
            <Shield size={32} />
          </div>
          <h2 className="font-gaming" style={{ fontSize: '1.2rem' }}>Admin Security Gate</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Authorized Matrix Gaming Staff Only</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Staff Passcode</label>
            <input type="password" className="form-control" placeholder="Enter passcode..." value={passcodeVal} onChange={e => setPasscodeVal(e.target.value)} required />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hint: Enter <strong>1337</strong> to log in.</span>
          </div>
          {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{authError}</div>}
          <button type="submit" className="btn btn-neon-purple">Unlock Console</button>
        </form>
      </div>
    );
  }

  // ── MAIN ADMIN UI ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

      {/* Sub-navigation */}
      <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(['dashboard', 'stations', 'analytics'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`btn ${activeTab === tab ? 'btn-neon-purple' : 'btn-secondary'}`}
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
              {tab === 'dashboard' ? 'Live Operations Hub' : tab === 'stations' ? 'Station Config' : 'Analytics'}
            </button>
          ))}
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="btn btn-secondary"
          style={{ width: 'auto', padding: '8px 14px', fontSize: '0.8rem', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
          <LogOut size={14} /> Exit Admin
        </button>
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <>
          {/* Stat widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
            {[
              { label: "TODAY'S REVENUE", value: formatRupees(todayRevenue), sub: 'Completed checkouts today', color: 'var(--neon-green)' },
              { label: 'ACTIVE PLAYERS', value: `${checkedInBookings.length} IN PLAY`, sub: `${overdueBookings.length} overdue`, color: overdueBookings.length > 0 ? '#ef4444' : 'var(--neon-blue)' },
              { label: "TODAY'S BOOKINGS", value: `${todayBookings.length} TOTAL`, sub: 'All status categories', color: 'var(--neon-purple)' },
              { label: 'STATIONS FREE', value: `${availableStationsCount} / 9`, sub: 'Available for walk-ins', color: '#fff' },
            ].map(w => (
              <div key={w.label} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{w.label}</span>
                <strong className="font-gaming" style={{ fontSize: '1.4rem', color: w.color }}>{w.value}</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{w.sub}</span>
              </div>
            ))}
          </div>

          {/* ════════════════════════════════════════
              OVERDUE ALERTS BANNER
          ════════════════════════════════════════ */}
          {overdueBookings.length > 0 && (
            <div className="overdue-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{overdueBookings.length} Active Session(s) Overdue!</strong>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Customer(s) have passed their scheduled end time. Check Out or Extend session below.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              UPCOMING CHECK-IN REMINDER BANNER
          ════════════════════════════════════════ */}
          {upcomingBookingsRequiringCheckIn.length > 0 && (
            <div style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid var(--neon-blue)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: 'var(--neon-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{upcomingBookingsRequiringCheckIn.length} Customer Arrival(s) Pending Check-In</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Scheduled start time has arrived or is approaching. Click <strong>Check In</strong> when player arrives.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              LIVE SESSIONS HUB (REAL-TIME TIMERS)
          ════════════════════════════════════════ */}
          <div className="glass-card border-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h3 className="font-gaming" style={{ fontSize: '1.1rem', color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} /> Live Gaming Sessions Hub
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Real-time session clocks, live billing calculations, 1-tap Check-In & Check-Out
                </p>
              </div>
              <button onClick={() => { setShowWalkInModal(true); setWError(''); setWType('PC'); const av = stationsList.find(s => s.type === 'PC' && s.status === 'Available'); setWStationId(av?.id || ''); }}
                className="btn btn-neon-green" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}>
                <Plus size={15} /> New Walk-In
              </button>
            </div>

            {/* Active Sessions Grid */}
            {checkedInBookings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px dashed var(--border-muted)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No players are currently checked in. Station walk-ins and upcoming reservations will appear here live.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {checkedInBookings.map(b => {
                  const station = stationsList.find(s => s.id === b.stationId);
                  const isPS5 = station?.type === 'PS5';
                  const isOverdue = new Date(`${b.bookingDate}T${b.scheduledEndTime}:00`) < nowTick;
                  const liveTiming = getEffectiveSessionTiming(b, nowTick.toISOString());
                  const timer = formatLiveTimer(b.actualStartTime || `${b.bookingDate}T${b.startTime}:00`, nowTick);

                  return (
                    <div key={b.id} className={`glass-card live-session-card ${isOverdue ? 'border-glow-purple' : ''}`} style={{
                      borderColor: isOverdue ? '#ef4444' : 'var(--neon-blue)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: isOverdue ? 'rgba(239,68,68,0.04)' : 'rgba(18,22,45,0.7)',
                    }}>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-playing">
                              <span className="pulse-green" style={{ width: '6px', height: '6px', background: 'var(--status-inuse)' }} />
                              PLAYING NOW
                            </span>
                            {isOverdue && <span className="badge badge-overdue"><AlertTriangle size={10} /> OVERDUE</span>}
                          </div>
                          <h4 style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 'bold' }}>{b.customerName}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.customerPhone}</span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className="font-gaming" style={{ color: 'var(--neon-blue)', fontSize: '1rem', fontWeight: 'bold' }}>
                            {station?.name}
                          </span>
                          {isPS5 && <div style={{ fontSize: '0.7rem', color: 'var(--neon-purple)' }}>{b.numControllers} Controllers</div>}
                        </div>
                      </div>

                      {/* Live Timer & Estimated Bill */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Play Time</span>
                          <div className={`live-timer-text ${isOverdue ? 'live-timer-overdue' : ''}`}>
                            {timer.text}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Bill</span>
                          <div className="font-gaming" style={{ fontSize: '1.15rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>
                            {formatRupees(liveTiming.estimatedOrFinalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Timing & Schedule Info */}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Scheduled Window:</span>
                          <strong>{b.startTime} → {b.scheduledEndTime}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Check-In Recorded:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <strong>{new Date(b.actualStartTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                            <button onClick={() => { setShowCheckInEditModal(b); setEditCheckInTimeVal(new Date(b.actualStartTime!).toLocaleTimeString([], { hour24: false, hour: '2-digit', minute: '2-digit' })); }}
                              title="Correct check-in time" style={{ background: 'none', border: 'none', color: 'var(--neon-blue)', cursor: 'pointer', padding: 0 }}>
                              <Edit3 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => { setShowCheckoutModal(b); setPaymentMethod('UPI'); setCustomFinalAmount(''); }} className="btn btn-neon-green" style={{ flex: 1, padding: '10px 8px', fontSize: '0.82rem' }}>
                          <Check size={14} /> Check Out Now
                        </button>
                        <button onClick={() => openExtensionModal(b)} className="btn btn-secondary" style={{ width: 'auto', padding: '10px 12px', fontSize: '0.82rem' }}>
                          <Sliders size={14} /> Extend
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              BOOKINGS & OPERATIONS TABLE/LIST
          ════════════════════════════════════════ */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <h3 className="font-gaming" style={{ fontSize: '1.05rem' }}>All Booking Records</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={refreshData} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 12px' }}><RefreshCw size={14} /> Refresh</button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Name, phone, or booking ID…" className="form-control" style={{ paddingLeft: '36px' }}
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="form-control" style={{ width: 'auto', minWidth: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                {['Confirmed','Checked In','Completed','Cancelled','No Show'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Booking Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredBookings.length === 0 ? (
                <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>No bookings match criteria.</div>
              ) : (
                filteredBookings
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(booking => {
                    const isPS5 = booking.segments.some(s => s.stationType === 'PS5');
                    const timing = getEffectiveSessionTiming(booking, nowTick.toISOString());
                    return (
                      <div key={booking.id} className="glass-card" style={{
                        padding: '16px',
                        borderLeft: `3px solid ${booking.status === 'Checked In' ? 'var(--neon-blue)' : booking.status === 'Confirmed' ? 'var(--neon-purple)' : booking.status === 'Completed' ? 'var(--neon-green)' : 'var(--text-muted)'}`,
                        display: 'flex', flexDirection: 'column', gap: '12px'
                      }}>
                        {/* Booking header */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <span className="font-gaming" style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>{booking.id}</span>
                              <span className={`badge ${booking.status === 'Confirmed' ? 'badge-booked' : booking.status === 'Checked In' ? 'badge-inuse' : booking.status === 'Completed' ? 'badge-available' : 'badge-maintenance'}`}>{booking.status}</span>
                              {isPS5 && <span className="badge badge-maintenance"><Gamepad size={10} /> PS5 × {booking.numControllers} ctrl</span>}
                              <span className={`badge ${timing.isFallback ? 'badge-fallback' : 'badge-actual'}`}>
                                {timing.isFallback ? 'Fallback Timing' : 'Actual Timing'}
                              </span>
                            </div>
                            <div style={{ fontWeight: 'bold', marginTop: '4px' }}>{booking.customerName} · <span style={{ color: 'var(--text-secondary)' }}>{booking.customerPhone}</span></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {booking.bookingDate} · Scheduled: {booking.startTime}–{booking.scheduledEndTime}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {booking.status === 'Confirmed' && (
                              <>
                                <button onClick={() => handleCheckIn(booking.id)} className="btn btn-neon-blue" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem' }}>
                                  <Play size={12} /> Check In
                                </button>
                                <button onClick={() => { setShowCheckoutModal(booking); setPaymentMethod('UPI'); setCustomFinalAmount(''); }} className="btn btn-neon-green" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}>
                                  Check Out
                                </button>
                                <button onClick={() => handleNoShow(booking.id)} className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                                  No Show
                                </button>
                                <button onClick={() => handleCancel(booking.id)} className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                                  Cancel
                                </button>
                              </>
                            )}
                            {booking.status === 'Checked In' && (
                              <>
                                <button onClick={() => openExtensionModal(booking)} className="btn btn-neon-purple" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}>
                                  <Sliders size={11} /> Extend/Swap
                                </button>
                                <button onClick={() => { setShowCheckoutModal(booking); setPaymentMethod('UPI'); setCustomFinalAmount(''); }} className="btn btn-neon-green" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}>
                                  <Check size={11} /> Check Out
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Timing Source Detail */}
                        <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Timing Source:</span>
                            <span style={{ color: timing.isFallback ? '#f59e0b' : 'var(--neon-green)', fontWeight: 'bold' }}>{timing.timingSource}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Effective Duration:</span>
                            <strong>{timing.durationMinutes} mins ({timing.durationHours} hrs)</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Payment:</span>
                            <strong>{booking.paymentStatus} {booking.paymentMethod ? `(${booking.paymentMethod})` : ''}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-muted)', paddingTop: '4px', marginTop: '2px' }}>
                            <span>Total Amount:</span>
                            <strong style={{ color: 'var(--neon-green)', fontSize: '0.95rem' }}>
                              {formatRupees(booking.finalAmount !== null ? booking.finalAmount : timing.estimatedOrFinalAmount)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'stations' && <StationConfig stations={stationsList} onUpdate={refreshData} />}
      {activeTab === 'analytics' && <AnalyticsView bookings={bookingsList} stations={stationsList} />}

      {/* ════════════════════════════════════════
          MODAL: WALK-IN
      ════════════════════════════════════════ */}
      {showWalkInModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card border-glow-green" style={{ maxWidth: '460px' }}>
            <h3 className="font-gaming" style={{ marginBottom: '16px', color: 'var(--neon-green)' }}>Create Walk-in Session</h3>
            <form onSubmit={handleCreateWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Player Name</label>
                <input type="text" placeholder="Walk-In Customer" className="form-control" value={wName} onChange={e => setWName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile (Optional)</label>
                <input type="tel" placeholder="9876543210" className="form-control" value={wPhone} onChange={e => setWPhone(e.target.value)} />
              </div>

              {/* Device type toggle */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setWType('PC'); const av = stationsList.find(s => s.type === 'PC' && s.status === 'Available'); setWStationId(av?.id || ''); setWControllers(1); }}
                  className={`btn ${wType === 'PC' ? 'btn-neon-blue' : 'btn-secondary'}`} style={{ flex: 1 }}>
                  <Laptop size={15} /> PC
                </button>
                <button type="button" onClick={() => { setWType('PS5'); const av = stationsList.find(s => s.type === 'PS5' && s.status === 'Available'); setWStationId(av?.id || ''); }}
                  className={`btn ${wType === 'PS5' ? 'btn-neon-purple' : 'btn-secondary'}`} style={{ flex: 1 }}>
                  <Gamepad size={15} /> PS5
                </button>
              </div>

              {wType === 'PS5' && (
                <div className="form-group">
                  <label className="form-label">Controllers (₹90 each/hr)</label>
                  <div className="qty-selector">
                    {[1,2,3,4].map(n => (
                      <button key={n} type="button" onClick={() => setWControllers(n)}
                        className={`qty-btn${wControllers === n ? ' selected' : ''}`}>
                        {n}<span className="qty-label">{n === 1 ? 'ctrl' : 'ctrls'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Station</label>
                <select className="form-control" value={wStationId} onChange={e => setWStationId(e.target.value)} required>
                  <option value="">-- Choose Free Station --</option>
                  {stationsList.filter(s => s.type === wType && s.status === 'Available').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <DualTimePicker label="Start Time" value={wStartTime || '10:00'} onChange={setWStartTime} />
              <DurationChips value={wDuration} onChange={setWDuration} />

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Est. End Time:</span>
                <strong style={{ color: 'var(--neon-green)' }}>{calculateEndTime(wStartTime || '10:00', wDuration)}</strong>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input type="text" placeholder="e.g. needs headset swap" className="form-control" value={wNotes} onChange={e => setWNotes(e.target.value)} />
              </div>

              {wError && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{wError}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowWalkInModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-neon-green">Check In Now</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL: CHECKOUT (SMART TIMING BREAKDOWN)
      ════════════════════════════════════════ */}
      {showCheckoutModal && (() => {
        const timing = getEffectiveSessionTiming(showCheckoutModal, nowTick.toISOString());
        const firstSeg = showCheckoutModal.segments[0];
        const stationType = firstSeg ? firstSeg.stationType : 'PC';
        const numCtrls = showCheckoutModal.numControllers || 1;
        const ratePerHr = stationType === 'PS5' ? 90 * numCtrls : 120;
        const calculatedAmount = timing.estimatedOrFinalAmount;

        return (
          <div className="modal-overlay">
            <div className="modal-content glass-card border-glow-green" style={{ maxWidth: '520px' }}>
              <h3 className="font-gaming" style={{ marginBottom: '14px', color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} /> Checkout & Final Invoice
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

                {/* Customer & Station info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CUSTOMER</span>
                    <div style={{ fontWeight: 'bold' }}>{showCheckoutModal.customerName}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{showCheckoutModal.customerPhone}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STATION</span>
                    <div style={{ fontWeight: 'bold', color: 'var(--neon-blue)' }}>{firstSeg?.stationName}</div>
                    {stationType === 'PS5' && <span style={{ fontSize: '0.75rem', color: 'var(--neon-purple)' }}>{numCtrls} Controllers</span>}
                  </div>
                </div>

                {/* 4-Tier Timing Source Indicator */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>TIMING SOURCE:</span>
                    <span className={`badge ${timing.isFallback ? 'badge-fallback' : 'badge-actual'}`}>
                      Priority {timing.priority}: {timing.timingSource}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed var(--border-muted)', margin: '4px 0' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Scheduled Time:</span>
                      <div>{showCheckoutModal.startTime} → {showCheckoutModal.scheduledEndTime} ({formatDuration(timing.scheduledDurationHours)})</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Actual Check-In:</span>
                      <div>{showCheckoutModal.actualStartTime ? new Date(showCheckoutModal.actualStartTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Not Recorded (Fallback)'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Actual Check-Out:</span>
                      <div>{showCheckoutModal.actualEndTime ? new Date(showCheckoutModal.actualEndTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Calculated Duration:</span>
                      <div style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>{timing.durationMinutes} mins ({timing.durationHours} hrs)</div>
                    </div>
                  </div>

                  {timing.isFallback && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '8px', fontSize: '0.72rem', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>Fallback scheduled timing applied to prevent staff error overcharging.</span>
                    </div>
                  )}
                </div>

                {/* Rate Calculation Breakdown */}
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rate Structure:</span>
                    <strong>{stationType === 'PS5' ? `${numCtrls} Ctrl × ₹90/hr = ₹${ratePerHr}/hr` : '₹120/hr'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Billable Time:</span>
                    <strong>{timing.durationMinutes} mins proportional</strong>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-muted)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <span>Calculated Total:</span>
                    <span style={{ color: 'var(--neon-green)' }}>{formatRupees(calculatedAmount)}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="form-group">
                  <label className="form-label"><CreditCard size={12} /> Payment Method</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['UPI', 'Cash'] as const).map(pm => (
                      <button key={pm} type="button" onClick={() => setPaymentMethod(pm)}
                        className={`btn ${paymentMethod === pm ? (pm === 'UPI' ? 'btn-neon-blue' : 'btn-neon-green') : 'btn-secondary'}`}
                        style={{ flex: 1 }}>
                        {pm === 'UPI' ? 'UPI / QR Code' : 'Cash'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Override input */}
                <div className="form-group">
                  <label className="form-label">Custom Override Amount (Optional)</label>
                  <input type="number" placeholder={`Default: ₹${calculatedAmount}`} className="form-control"
                    value={customFinalAmount} onChange={e => setCustomFinalAmount(e.target.value)} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Leave blank to charge calculated total of {formatRupees(calculatedAmount)}.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowCheckoutModal(null)} className="btn btn-secondary">Back</button>
                <button onClick={handleConfirmCheckout} className="btn btn-neon-green">Confirm Paid & Complete</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════
          MODAL: EDIT CHECK-IN TIME CORRECTION
      ════════════════════════════════════════ */}
      {showCheckInEditModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card border-glow-blue" style={{ maxWidth: '420px' }}>
            <h3 className="font-gaming" style={{ marginBottom: '12px', color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={18} /> Correct Check-In Timestamp
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Adjust check-in time if customer arrived earlier/later than when Check-In was clicked.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PLAYER</span>
                <div style={{ fontWeight: 'bold' }}>{showCheckInEditModal.customerName} ({showCheckInEditModal.id})</div>
              </div>

              <DualTimePicker label="Correct Check-In Time" value={editCheckInTimeVal} onChange={setEditCheckInTimeVal} />

              <div style={{ background: 'rgba(0,240,255,0.06)', border: '1px dashed var(--neon-blue)', borderRadius: '8px', padding: '10px', fontSize: '0.78rem', color: 'var(--neon-blue)' }}>
                Updating check-in time will immediately recalculate live session duration & bill.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowCheckInEditModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveCheckInCorrection} className="btn btn-neon-blue">Save Correction</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL: EXTEND / SWAP
      ════════════════════════════════════════ */}
      {showExtendModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card border-glow-purple" style={{ maxWidth: '460px' }}>
            <h3 className="font-gaming" style={{ marginBottom: '14px', color: 'var(--neon-purple)' }}>Extend / Switch Station</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PLAYER:</span>
                <div style={{ fontWeight: 'bold' }}>{showExtendModal.customerName}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--neon-blue)' }}>
                  Current: {stationsList.find(s => s.id === showExtendModal.stationId)?.name}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Target Station</label>
                <select className="form-control" value={extendStationId} onChange={e => {
                  setExtendStationId(e.target.value);
                  const st = stationsList.find(s => s.id === e.target.value);
                  if (st?.type === 'PC') setExtendControllers(1);
                }} required>
                  <option value="">-- Select Target --</option>
                  {stationsList.map(s => {
                    const isCurrent = s.id === showExtendModal.stationId;
                    const isAvail = s.status === 'Available';
                    return (
                      <option key={s.id} value={s.id} disabled={!isCurrent && !isAvail}>
                        {s.name} ({s.type} · ₹{s.hourlyRate}/hr) {isCurrent ? '[CURRENT]' : isAvail ? '' : '[OCCUPIED]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {stationsList.find(s => s.id === extendStationId)?.type === 'PS5' && (
                <div className="form-group">
                  <label className="form-label">Controllers (₹90 each/hr)</label>
                  <div className="qty-selector">
                    {[1,2,3,4].map(n => (
                      <button key={n} type="button" onClick={() => setExtendControllers(n)}
                        className={`qty-btn${extendControllers === n ? ' selected' : ''}`}>
                        {n}<span className="qty-label">{n === 1 ? 'ctrl' : 'ctrls'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <DurationChips value={extendDuration} onChange={setExtendDuration} />

              {extendStationId && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Extension Estimate:</span>
                  <strong style={{ color: 'var(--neon-purple)' }}>
                    {(() => {
                      const st = stationsList.find(s => s.id === extendStationId);
                      if (!st) return '—';
                      const rate = st.type === 'PS5' ? st.hourlyRate * extendControllers : st.hourlyRate;
                      return formatRupees(Math.round(rate * extendDuration));
                    })()}
                  </strong>
                </div>
              )}

              {extendError && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{extendError}</div>}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowExtendModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleConfirmExtension} className="btn btn-neon-purple">Confirm Extension</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
