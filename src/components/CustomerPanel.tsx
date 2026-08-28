import { useState, useCallback } from 'react';
import {
  getStations,
  getBookings,
  createBooking,
  cancelBooking,
  rescheduleBooking,
  isStationAvailable,
  calculateEndTime,
  formatRupees,
  getWhatsAppConfirmation,
} from '../db/storage';
import type { Station, Booking } from '../db/storage';
import {
  Laptop,
  Gamepad,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  XCircle,
  MessageSquare,
  Zap,
} from 'lucide-react';

type SubView = 'home' | 'book' | 'manage';

// ── PRESET DURATION CHIPS ─────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: '30 min',  hours: 0.5 },
  { label: '45 min',  hours: 0.75 },
  { label: '1 hr',    hours: 1 },
  { label: '1h 15m',  hours: 1.25 },
  { label: '1h 30m',  hours: 1.5 },
  { label: '1h 45m',  hours: 1.75 },
  { label: '2 hrs',   hours: 2 },
  { label: '2h 30m',  hours: 2.5 },
  { label: '3 hrs',   hours: 3 },
  { label: '4 hrs',   hours: 4 },
  { label: '5 hrs',   hours: 5 },
  { label: '6 hrs',   hours: 6 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

function calcEstimate(station: Station | undefined, controllers: number, durationHours: number): number {
  if (!station) return 0;
  const rate = station.type === 'PS5' ? station.hourlyRate * controllers : station.hourlyRate;
  return Math.round(rate * durationHours);
}

// ── COMPONENT: DualTimePicker ──────────────────────────────────────────────────
interface DualTimePickerProps {
  value: string; // HH:MM
  onChange: (v: string) => void;
  label?: string;
}
function DualTimePicker({ value, onChange, label }: DualTimePickerProps) {
  const [h, m] = value.split(':').map(Number);

  const setH = (hh: number) => onChange(`${String(hh).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  const setM = (mm: number) => onChange(`${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);

  return (
    <div className="form-group">
      {label && <label className="form-label"><Clock size={13} /> {label}</label>}
      <div className="time-picker-row">
        <select className="form-control" value={h} onChange={e => setH(Number(e.target.value))}>
          {Array.from({ length: 14 }, (_, i) => 10 + i).map(hour => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2,'0')} {hour < 12 ? 'AM' : 'PM'}
            </option>
          ))}
        </select>
        <span className="time-picker-separator">:</span>
        <select className="form-control" value={m} onChange={e => setM(Number(e.target.value))}>
          {[0, 15, 30, 45].map(min => (
            <option key={min} value={min}>{String(min).padStart(2,'0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── COMPONENT: DurationPicker ──────────────────────────────────────────────────
interface DurationPickerProps {
  value: number; // fractional hours
  onChange: (v: number) => void;
}
function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <div className="form-group">
      <label className="form-label"><Clock size={13} /> Duration</label>
      <div className="duration-chips">
        {DURATION_OPTIONS.map(opt => (
          <button
            key={opt.hours}
            type="button"
            onClick={() => onChange(opt.hours)}
            className={`duration-chip${value === opt.hours ? ' selected' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── COMPONENT: ControllerSelector ─────────────────────────────────────────────
interface ControllerSelectorProps {
  value: number;
  onChange: (v: number) => void;
}
function ControllerSelector({ value, onChange }: ControllerSelectorProps) {
  return (
    <div className="form-group">
      <label className="form-label"><Gamepad size={13} /> Number of Controllers (₹90 each / hr)</label>
      <div className="qty-selector">
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`qty-btn${value === n ? ' selected' : ''}`}
          >
            {n}
            <span className="qty-label">{n === 1 ? 'Controller' : 'Controllers'}</span>
          </button>
        ))}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        Single PS5 station — up to 4 players simultaneously
      </span>
    </div>
  );
}

// ── COMPONENT: LiveSummaryPill ─────────────────────────────────────────────────
interface LiveSummaryPillProps {
  station?: Station;
  controllers: number;
  date: string;
  startTime: string;
  durationHours: number;
  bookingType: 'PC' | 'PS5' | null;
}
function LiveSummaryPill({ station, controllers, date, startTime, durationHours, bookingType }: LiveSummaryPillProps) {
  if (!bookingType) return null;
  const endTime = calculateEndTime(startTime, durationHours);
  const estimate = calcEstimate(station, controllers, durationHours);
  return (
    <div className="live-summary-pill">
      <div className="pill-row">
        <span className="pill-label">Station</span>
        <span className="pill-value">{station?.name ?? (bookingType === 'PC' ? 'PC Gaming' : 'PS5')}</span>
      </div>
      {bookingType === 'PS5' && (
        <div className="pill-row">
          <span className="pill-label">Controllers</span>
          <span className="pill-value">{controllers}</span>
        </div>
      )}
      <div className="pill-row">
        <span className="pill-label">Date</span>
        <span className="pill-value">{date}</span>
      </div>
      <div className="pill-row">
        <span className="pill-label">Time</span>
        <span className="pill-value">{startTime} → {endTime}</span>
      </div>
      <div className="pill-row">
        <span className="pill-label">Duration</span>
        <span className="pill-value">{formatDuration(durationHours)}</span>
      </div>
      <div className="pill-row" style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '6px', marginTop: '2px' }}>
        <span className="pill-label">Estimated</span>
        <span className="pill-price">{formatRupees(estimate)}</span>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function CustomerPanel() {
  const [subView, setSubView] = useState<SubView>('home');

  // Booking Wizard
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingType, setBookingType] = useState<'PC' | 'PS5' | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingHour, setBookingHour] = useState('17');
  const [bookingMin, setBookingMin] = useState('00');
  const [bookingDuration, setBookingDuration] = useState(1);
  const [numControllers, setNumControllers] = useState(1);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  // Manage Booking
  const [searchId, setSearchId] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [managedBooking, setManagedBooking] = useState<Booking | null>(null);
  const [manageError, setManageError] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleHour, setRescheduleHour] = useState('17');
  const [rescheduleMin, setRescheduleMin] = useState('00');
  const [rescheduleDuration, setRescheduleDuration] = useState(1);

  const stations = getStations();
  const bookings = getBookings();

  // Derived values
  const bookingTime = `${String(bookingHour).padStart(2,'0')}:${String(bookingMin).padStart(2,'0')}`;
  const endTime = calculateEndTime(bookingTime, bookingDuration);
  const selectedStation = stations.find(s => s.id === selectedStationId);
  const estimate = calcEstimate(selectedStation, numControllers, bookingDuration);

  const activePCHeadcount = stations.filter(s => s.type === 'PC' && s.status === 'Available').length;
  const isPS5AvailableNow = stations.find(s => s.type === 'PS5')?.status === 'Available';

  const getAvailableStationsForSlot = useCallback((): Station[] => {
    if (!bookingType) return [];
    return stations.filter(s =>
      s.type === bookingType &&
      s.status !== 'Maintenance' &&
      isStationAvailable(s.id, bookingDate, bookingTime, bookingDuration)
    );
  }, [bookingType, bookingDate, bookingTime, bookingDuration, stations]);

  // ── WIZARD NAVIGATION ──────────────────────────────────────────────────────
  const TOTAL_STEPS = bookingType === 'PS5' ? 6 : 5; // PS5 has controller step

  // Determine which numbered wizard steps are active
  // Steps for PC:  1=Type, 2=Time, 3=Station, 4=Details, 5=Confirm
  // Steps for PS5: 1=Type, 2=Controllers, 3=Time, 4=Station, 5=Details, 6=Confirm
  const stepLabels = bookingType === 'PS5'
    ? ['Type', 'Controllers', 'Time', 'Station', 'Details', 'Confirm']
    : ['Type', 'Time', 'Station', 'Details', 'Confirm'];

  const handleStartBooking = (type: 'PC' | 'PS5') => {
    setBookingType(type);
    setBookingStep(1);
    setNumControllers(1);
    setSubView('book');
    setSelectedStationId('');
    setErrorMessage('');
    setSuccessBooking(null);
  };

  const handleNextStep = () => {
    setErrorMessage('');

    if (bookingStep === 1) {
      setBookingStep(2);
    } else if (bookingStep === 2) {
      if (bookingType === 'PS5') {
        // Controllers step — just proceed
        setBookingStep(3);
      } else {
        // PC Time step — validate stations exist
        const free = getAvailableStationsForSlot();
        if (free.length === 0) {
          setErrorMessage('No stations are available for this date and time slot. Please try another time.');
          return;
        }
        setBookingStep(3);
      }
    } else if (bookingStep === 3) {
      if (bookingType === 'PS5') {
        // PS5 Time step — validate
        const free = getAvailableStationsForSlot();
        if (free.length === 0) {
          setErrorMessage('PS5 is not available for this date and time slot. Please try another time.');
          return;
        }
        // Auto-select the only PS5 station
        const ps5 = stations.find(s => s.type === 'PS5');
        if (ps5) setSelectedStationId(ps5.id);
        setBookingStep(4);
      } else {
        // PC Station selection step
        if (!selectedStationId) {
          setErrorMessage('Please select a gaming station.');
          return;
        }
        setBookingStep(4);
      }
    } else if (bookingStep === 4) {
      if (bookingType === 'PS5') {
        // PS5 Details step
        if (!customerName.trim()) { setErrorMessage('Please enter your full name.'); return; }
        const ph = customerPhone.replace(/\D/g,'');
        if (ph.length < 10) { setErrorMessage('Please enter a valid 10-digit Indian mobile number.'); return; }
        setBookingStep(5);
      } else {
        // PC Details step
        if (!customerName.trim()) { setErrorMessage('Please enter your full name.'); return; }
        const ph = customerPhone.replace(/\D/g,'');
        if (ph.length < 10) { setErrorMessage('Please enter a valid 10-digit Indian mobile number.'); return; }
        setBookingStep(5);
      }
    } else if (bookingStep === 5) {
      if (bookingType === 'PS5') {
        // PS5 Station selection (auto-selected already) — go to details
        setBookingStep(6);
      }
      // PC step 5 is confirm — handled separately
    }
  };

  const handlePrevStep = () => {
    if (bookingStep > 1) {
      setBookingStep(prev => prev - 1);
      setErrorMessage('');
    }
  };

  const confirmStep = bookingType === 'PS5' ? 6 : 5;

  const handleCompleteBooking = () => {
    const result = createBooking({
      customerName,
      customerPhone,
      stationId: selectedStationId,
      bookingDate,
      startTime: bookingTime,
      durationHours: bookingDuration,
      notes: bookingNotes,
      numControllers: bookingType === 'PS5' ? numControllers : 1,
    });

    if (typeof result === 'string') {
      setErrorMessage(result);
    } else {
      setSuccessBooking(result);
      setBookingStep(confirmStep + 1); // success screen
      setCustomerName('');
      setCustomerPhone('');
      setBookingNotes('');
    }
  };

  // Manage booking handlers
  const handleSearchBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setManageError('');
    setManagedBooking(null);
    setRescheduleMode(false);
    const match = bookings.find(b =>
      b.id.toUpperCase() === searchId.trim().toUpperCase() &&
      b.customerPhone.replace(/\D/g,'').endsWith(searchPhone.replace(/\D/g,''))
    );
    if (match) {
      setManagedBooking(match);
      setRescheduleDate(match.bookingDate);
      setRescheduleHour(match.startTime.split(':')[0]);
      setRescheduleMin(match.startTime.split(':')[1]);
      const diffMins =
        (parseInt(match.scheduledEndTime.split(':')[0]) * 60 + parseInt(match.scheduledEndTime.split(':')[1])) -
        (parseInt(match.startTime.split(':')[0]) * 60 + parseInt(match.startTime.split(':')[1]));
      setRescheduleDuration(Math.max(0.5, diffMins / 60));
    } else {
      setManageError('No matching booking found. Please check your Booking ID and mobile number.');
    }
  };

  const handleCancelBooking = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      const result = cancelBooking(id);
      if (typeof result === 'string') setManageError(result);
      else { alert('Booking cancelled successfully.'); setManagedBooking(result); }
    }
  };

  const handleReschedule = () => {
    if (!managedBooking) return;
    const rescheduleTime = `${String(rescheduleHour).padStart(2,'0')}:${String(rescheduleMin).padStart(2,'0')}`;
    const result = rescheduleBooking(managedBooking.id, rescheduleDate, rescheduleTime, rescheduleDuration);
    if (typeof result === 'string') { setManageError(result); }
    else { alert('Booking rescheduled!'); setManagedBooking(result); setRescheduleMode(false); setManageError(''); }
  };

  // ── UI HELPERS ─────────────────────────────────────────────────────────────
  const badgeClass = (status: string) => {
    if (status === 'Confirmed') return 'badge-booked';
    if (status === 'Checked In') return 'badge-inuse';
    if (status === 'Completed') return 'badge-available';
    return 'badge-maintenance';
  };

  // Sticky footer visible during booking steps 1→confirmStep
  const showStickyFooter = subView === 'book' && bookingStep <= confirmStep;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', paddingBottom: showStickyFooter ? '88px' : 0 }}>

      {/* ── TAB HEADER ── */}
      {subView !== 'book' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button onClick={() => { setSubView('home'); setManagedBooking(null); }}
            className={`btn ${subView === 'home' ? 'btn-neon-blue' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '10px 24px' }}>
            Home / Pricing
          </button>
          <button onClick={() => { setSubView('manage'); setManageError(''); setManagedBooking(null); }}
            className={`btn ${subView === 'manage' ? 'btn-neon-blue' : 'btn-secondary'}`}
            style={{ width: 'auto', padding: '10px 24px' }}>
            Manage Booking
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════
          HOME VIEW
      ════════════════════════════════════════ */}
      {subView === 'home' && (
        <>
          {/* Hero */}
          <section className="glass-card neon-blue-hover" style={{ position: 'relative', overflow: 'hidden', padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 50% 30%, rgba(0,240,255,0.15) 0%, transparent 70%)', zIndex: -1 }} />
            <span className="font-gaming" style={{ color: 'var(--neon-green)', fontSize: '0.85rem', fontWeight: 'bold' }}>Premium Esports Hub</span>
            <h2 className="font-gaming" style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1.1, textShadow: '0 0 15px rgba(0,240,255,0.4)' }}>
              Level Up Your Game
            </h2>
            <p style={{ maxWidth: '580px', margin: '0 auto' }}>
              High-end PC gaming and console action. Book instantly online — play now, pay later with Cash or UPI.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '12px', width: '100%', maxWidth: '380px' }}>
              <button onClick={() => handleStartBooking('PC')} className="btn btn-neon-blue">
                <Laptop size={18} /> Book PC Station
              </button>
              <button onClick={() => handleStartBooking('PS5')} className="btn btn-neon-purple">
                <Gamepad size={18} /> Book PS5 Station
              </button>
            </div>
          </section>

          {/* Pricing Cards */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 className="font-gaming" style={{ textAlign: 'center', fontSize: '1.4rem' }}>Gaming Stations & Live Status</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

              {/* PC Card */}
              <div className="glass-card neon-blue-hover" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Laptop color="var(--neon-blue)" size={22} />
                    <h3 style={{ margin: 0 }}>PC Gaming</h3>
                  </div>
                  <span className="font-gaming" style={{ fontSize: '1.2rem', color: 'var(--neon-blue)' }}>₹120/hr</span>
                </div>
                <p style={{ fontSize: '0.9rem' }}>8 high-performance rigs with 240Hz monitors, RTX graphics, and mechanical keyboards.</p>
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Live Availability:</span>
                    <span className="badge badge-available">
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-available)' }} />
                      {activePCHeadcount} / 8 FREE
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {stations.filter(s => s.type === 'PC').map(s => (
                      <div key={s.id} style={{
                        background: s.status === 'Available' ? 'rgba(16,185,129,0.1)' : s.status === 'Maintenance' ? 'rgba(107,114,128,0.1)' : 'rgba(236,72,153,0.1)',
                        border: `1px solid ${s.status === 'Available' ? 'var(--status-available)' : s.status === 'Maintenance' ? 'var(--status-maintenance)' : 'var(--status-inuse)'}`,
                        borderRadius: '6px', padding: '5px 4px', fontSize: '0.72rem', textAlign: 'center',
                        color: s.status === 'Available' ? '#fff' : 'var(--text-muted)'
                      }}>
                        {s.name.replace('PC ', 'PC')}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleStartBooking('PC')} className="btn btn-neon-blue">Book PC Now</button>
              </div>

              {/* PS5 Card */}
              <div className="glass-card neon-purple-hover" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gamepad color="var(--neon-purple)" size={22} />
                    <h3 style={{ margin: 0 }}>PlayStation 5</h3>
                  </div>
                  <span className="font-gaming" style={{ fontSize: '1.2rem', color: 'var(--neon-purple)' }}>₹90/ctrl/hr</span>
                </div>
                <p style={{ fontSize: '0.9rem' }}>Console station on a 4K 120Hz display. Support 1–4 controllers for multiplayer groups.</p>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>1 Controller:</span><strong>₹90/hr</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>2 Controllers:</span><strong>₹180/hr</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>3 Controllers:</span><strong>₹270/hr</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>4 Controllers:</span><strong>₹360/hr</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Live Status:</span>
                  {isPS5AvailableNow
                    ? <span className="badge badge-available"><span className="pulse-green" style={{ width: '7px', height: '7px', background: 'var(--status-available)' }} />AVAILABLE</span>
                    : <span className="badge badge-inuse">IN USE</span>}
                </div>
                <button onClick={() => handleStartBooking('PS5')} className="btn btn-neon-purple">Book PS5 Now</button>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="font-gaming" style={{ textAlign: 'center', fontSize: '1.2rem' }}>How It Works</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { n: '1', color: 'var(--neon-blue)', title: 'Reserve Online', desc: 'Pick station, time & duration. No account needed.' },
                { n: '2', color: 'var(--neon-green)', title: 'WhatsApp Confirm', desc: 'Get your booking ticket instantly on WhatsApp.' },
                { n: '3', color: 'var(--neon-purple)', title: 'Play & Pay', desc: 'Walk in, check in, game hard, pay after.' },
              ].map(item => (
                <div key={item.n} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
                  <div style={{ color: item.color, fontSize: '1.6rem', fontWeight: 'bold' }}>{item.n}</div>
                  <h4 style={{ fontSize: '0.9rem' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.82rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 className="font-gaming" style={{ fontSize: '1rem' }}>Location & Hours</h3>
              <p style={{ fontSize: '0.87rem' }}><strong>Address:</strong><br />Matrix Gaming, 1st Floor, Tech Arcade, Sector 5, Bangalore — 560001</p>
              <p style={{ fontSize: '0.87rem' }}><strong>Open:</strong> Every Day 10:00 AM – 11:30 PM</p>
              <p style={{ fontSize: '0.87rem' }}><strong>Phone:</strong> +91 98765 43210</p>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
              <h3 className="font-gaming" style={{ fontSize: '1rem' }}>Need Help?</h3>
              <p>Chat with our staff directly on WhatsApp for tournament requests or equipment queries.</p>
              <a href="https://wa.me/919876543210?text=Hello%20Matrix%20Gaming!" target="_blank" rel="noreferrer"
                className="btn btn-neon-green" style={{ width: 'auto', textShadow: 'none' }}>
                <MessageSquare size={16} /> Chat on WhatsApp
              </a>
            </div>
          </section>
        </>
      )}

      {/* ════════════════════════════════════════
          BOOKING WIZARD
      ════════════════════════════════════════ */}
      {subView === 'book' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Wizard Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="font-gaming" style={{ fontSize: '1.2rem' }}>
              Book {bookingType} Session
            </h2>
            <button onClick={() => { setSubView('home'); setBookingStep(1); }}
              className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>

          {/* Stepper */}
          {bookingStep <= confirmStep && (
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '0 8px' }}>
              <div style={{ position: 'absolute', top: '13px', left: '5%', right: '5%', height: '2px', background: 'var(--border-muted)', zIndex: 1 }} />
              <div style={{ position: 'absolute', top: '13px', left: '5%', width: `${((bookingStep - 1) / (TOTAL_STEPS - 1)) * 90}%`, height: '2px', background: bookingType === 'PC' ? 'var(--neon-blue)' : 'var(--neon-purple)', zIndex: 2, transition: 'width 0.3s ease' }} />
              {stepLabels.map((label, idx) => {
                const step = idx + 1;
                const active = bookingStep >= step;
                return (
                  <div key={step} style={{ zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: active ? (bookingType === 'PC' ? 'var(--neon-blue)' : 'var(--neon-purple)') : 'var(--bg-secondary)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border-muted)'}`,
                      color: active ? '#000' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 'bold'
                    }}>{step}</div>
                    <span style={{ fontSize: '0.6rem', color: active ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {errorMessage}
            </div>
          )}

          {/* Live Summary Pill (shown from step 2 onwards) */}
          {bookingStep > 1 && bookingStep <= confirmStep && (
            <LiveSummaryPill
              station={selectedStation}
              controllers={numControllers}
              date={bookingDate}
              startTime={bookingTime}
              durationHours={bookingDuration}
              bookingType={bookingType}
            />
          )}

          {/* ── STEP 1: Choose Gaming Type ── */}
          {bookingStep === 1 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p>Select the gaming system you want to book:</p>
              <div style={{ display: 'flex', gap: '14px' }}>
                <button onClick={() => setBookingType('PC')}
                  className={`btn ${bookingType === 'PC' ? 'btn-neon-blue' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '20px 12px', flex: 1, height: '100px', textTransform: 'none' }}>
                  <Laptop size={28} />
                  <div><div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>PC Gaming</div><div style={{ fontSize: '0.72rem' }}>₹120/hour</div></div>
                </button>
                <button onClick={() => setBookingType('PS5')}
                  className={`btn ${bookingType === 'PS5' ? 'btn-neon-purple' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '20px 12px', flex: 1, height: '100px', textTransform: 'none' }}>
                  <Gamepad size={28} />
                  <div><div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>PlayStation 5</div><div style={{ fontSize: '0.72rem' }}>₹90/ctrl/hr</div></div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 (PS5): Controller Selection ── */}
          {bookingStep === 2 && bookingType === 'PS5' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ControllerSelector value={numControllers} onChange={setNumControllers} />
              <div style={{ background: 'rgba(189,0,255,0.06)', border: '1px dashed var(--neon-purple)', borderRadius: '8px', padding: '10px', fontSize: '0.82rem' }}>
                <strong>Pricing Preview for {numControllers} Controller{numControllers > 1 ? 's' : ''}:</strong>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {[0.5, 1, 1.5, 2, 3].map(h => (
                    <div key={h} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatDuration(h)}:</span>
                      <strong>{formatRupees(Math.round(numControllers * 90 * h))}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 (PC) / STEP 3 (PS5): Date, Time, Duration ── */}
          {((bookingType === 'PC' && bookingStep === 2) || (bookingType === 'PS5' && bookingStep === 3)) && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label"><Calendar size={13} /> Date</label>
                <input type="date" className="form-control" value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setBookingDate(e.target.value)} />
              </div>

              <DualTimePicker
                label="Start Time"
                value={`${String(bookingHour).padStart(2,'0')}:${String(bookingMin).padStart(2,'0')}`}
                onChange={v => { setBookingHour(v.split(':')[0]); setBookingMin(v.split(':')[1]); }}
              />

              <DurationPicker value={bookingDuration} onChange={setBookingDuration} />

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Calculated End Time:</span>
                <strong style={{ color: 'var(--neon-green)' }}>{endTime}</strong>
              </div>
            </div>
          )}

          {/* ── STEP 3 (PC): Choose Station ── */}
          {bookingType === 'PC' && bookingStep === 3 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.88rem' }}>
                Available <strong style={{ color: 'var(--neon-blue)' }}>PC</strong> stations on{' '}
                <strong>{bookingDate}</strong> from <strong>{bookingTime}</strong> to <strong>{endTime}</strong>:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                {getAvailableStationsForSlot().map(s => (
                  <button key={s.id} onClick={() => setSelectedStationId(s.id)}
                    className={`btn ${selectedStationId === s.id ? 'btn-neon-blue border-glow-blue' : 'btn-secondary'}`}
                    style={{ flexDirection: 'column', padding: '14px 8px', height: '80px', textTransform: 'none' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{s.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>₹{s.hourlyRate}/hr</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4 (PC) / STEP 4 (PS5 — PS5 station auto-selected, show details) ── */}
          {((bookingType === 'PC' && bookingStep === 4) || (bookingType === 'PS5' && bookingStep === 4)) && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Booking as a <strong style={{ color: 'var(--neon-green)' }}>Guest</strong> — no account or advance payment required.
              </p>
              <div className="form-group">
                <label className="form-label"><User size={13} /> Full Name</label>
                <input type="text" placeholder="e.g. Rahul Kumar" className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={13} /> Mobile Number (WhatsApp)</label>
                <input type="tel" placeholder="e.g. 9876543210" className="form-control" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10-digit Indian number — for WhatsApp confirmation ticket</span>
              </div>
              <div className="form-group">
                <label className="form-label"><FileText size={13} /> Notes (Optional)</label>
                <textarea placeholder="Preferred seat, game requests…" className="form-control" rows={2} value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── STEP 5 (PC) / STEP 5 (PS5): Full Booking Summary + Confirm ── */}
          {((bookingType === 'PC' && bookingStep === 5) || (bookingType === 'PS5' && bookingStep === 5)) && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 className="font-gaming" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
                Booking Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Player:</span><div>{customerName}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span><div>{customerPhone}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Station:</span>
                  <div style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>
                    {selectedStation?.name} ({bookingType})
                    {bookingType === 'PS5' && ` × ${numControllers} ctrl`}
                  </div>
                </div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date:</span><div>{bookingDate}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Time:</span><div>{bookingTime} → {endTime}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span><div>{formatDuration(bookingDuration)}</div></div>
                {bookingType === 'PS5' && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Controllers:</span><div>{numControllers} × ₹90/hr</div></div>
                )}
                <div><span style={{ color: 'var(--text-muted)' }}>Rate:</span>
                  <div>{bookingType === 'PS5' ? `₹${90 * numControllers}/hr (${numControllers} ctrl)` : '₹120/hr'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>Estimated Total:</span>
                <span className="font-gaming text-neon-green" style={{ fontSize: '1.4rem' }}>{formatRupees(estimate)}</span>
              </div>
              <div style={{ background: 'rgba(57,255,20,0.05)', border: '1px dashed var(--neon-green)', borderRadius: '8px', padding: '10px', fontSize: '0.75rem', color: 'var(--neon-green)', textAlign: 'center' }}>
                PAY AFTER PLAYING — NO ADVANCE REQUIRED (CASH / UPI)
              </div>
            </div>
          )}

          {/* ── PS5 STEP 6: same as PC step 5 but for PS5 ── */}
          {bookingType === 'PS5' && bookingStep === 6 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 className="font-gaming" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
                Booking Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Player:</span><div>{customerName}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span><div>{customerPhone}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Station:</span><div style={{ color: 'var(--neon-purple)', fontWeight: 'bold' }}>PS5 Station × {numControllers} ctrl</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date:</span><div>{bookingDate}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Time:</span><div>{bookingTime} → {endTime}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span><div>{formatDuration(bookingDuration)}</div></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Rate:</span><div>₹{90 * numControllers}/hr</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>Estimated Total:</span>
                <span className="font-gaming text-neon-green" style={{ fontSize: '1.4rem' }}>{formatRupees(estimate)}</span>
              </div>
              <div style={{ background: 'rgba(57,255,20,0.05)', border: '1px dashed var(--neon-green)', borderRadius: '8px', padding: '10px', fontSize: '0.75rem', color: 'var(--neon-green)', textAlign: 'center' }}>
                PAY AFTER PLAYING — NO ADVANCE REQUIRED (CASH / UPI)
              </div>
            </div>
          )}

          {/* ── SUCCESS SCREEN ── */}
          {bookingStep === confirmStep + 1 && successBooking && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ color: 'var(--neon-green)' }}><CheckCircle size={60} /></div>
              <div>
                <h3 className="font-gaming" style={{ color: 'var(--neon-green)', fontSize: '1.3rem' }}>Booking Confirmed!</h3>
                <p style={{ marginTop: '6px' }}>Your station reservation was completed successfully.</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px', width: '100%', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>BOOKING REFERENCE</span>
                <div className="font-gaming" style={{ fontSize: '1.3rem', color: 'var(--neon-blue)', fontWeight: 'bold' }}>{successBooking.id}</div>
                <div style={{ borderTop: '1px solid var(--border-muted)', margin: '4px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
                  <div><strong>Station:</strong> {successBooking.segments[0].stationName}</div>
                  {successBooking.numControllers > 1 && <div><strong>Controllers:</strong> {successBooking.numControllers}</div>}
                  <div><strong>Date:</strong> {successBooking.bookingDate}</div>
                  <div><strong>Time:</strong> {successBooking.startTime} – {successBooking.scheduledEndTime}</div>
                  <div><strong>Est. Total:</strong> {formatRupees(successBooking.estimatedAmount)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <a href={getWhatsAppConfirmation(successBooking).link} target="_blank" rel="noreferrer"
                  className="btn btn-neon-green" style={{ textShadow: 'none' }}>
                  <MessageSquare size={16} /> Send WhatsApp Confirmation
                </a>
                <button onClick={() => navigator.clipboard.writeText(getWhatsAppConfirmation(successBooking).text).then(() => alert('Copied!'))} className="btn btn-secondary">
                  Copy Booking Details
                </button>
                <button onClick={() => { setSubView('home'); setBookingStep(1); }} className="btn btn-neon-blue">
                  Return to Homepage
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          MANAGE BOOKING VIEW
      ════════════════════════════════════════ */}
      {subView === 'manage' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card">
            <h2 className="font-gaming" style={{ fontSize: '1.2rem', marginBottom: '16px', textAlign: 'center' }}>Manage Your Booking</h2>
            <form onSubmit={handleSearchBooking} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Booking ID</label>
                <input type="text" placeholder="e.g. MTX-12345" className="form-control" value={searchId} onChange={e => setSearchId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input type="tel" placeholder="e.g. 9876543210" className="form-control" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} required />
              </div>
              {manageError && <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px' }}>{manageError}</div>}
              <button type="submit" className="btn btn-neon-blue"><Search size={15} /> Lookup Booking</button>
            </form>
          </div>

          {managedBooking && (
            <div className="glass-card border-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>BOOKING ID</span>
                  <div className="font-gaming" style={{ color: 'var(--neon-blue)', fontSize: '1.1rem', fontWeight: 'bold' }}>{managedBooking.id}</div>
                </div>
                <span className={`badge ${badgeClass(managedBooking.status)}`}>{managedBooking.status}</span>
              </div>

              {!rescheduleMode ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Customer:</span><div>{managedBooking.customerName}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span><div>{managedBooking.customerPhone}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Station:</span><div style={{ fontWeight: 'bold' }}>{managedBooking.segments[0].stationName}</div></div>
                    {managedBooking.segments[0].stationType === 'PS5' && (
                      <div><span style={{ color: 'var(--text-muted)' }}>Controllers:</span><div>{managedBooking.numControllers}</div></div>
                    )}
                    <div><span style={{ color: 'var(--text-muted)' }}>Date & Time:</span><div>{managedBooking.bookingDate} · {managedBooking.startTime}–{managedBooking.scheduledEndTime}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span><div style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{formatRupees(managedBooking.finalAmount ?? managedBooking.estimatedAmount)}</div></div>
                  </div>
                  {managedBooking.notes && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Notes:</strong> {managedBooking.notes}</div>}
                  {managedBooking.status === 'Confirmed' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setRescheduleMode(true)} className="btn btn-neon-blue">Reschedule</button>
                      <button onClick={() => handleCancelBooking(managedBooking.id)} className="btn btn-secondary" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>
                        <XCircle size={15} /> Cancel
                      </button>
                    </div>
                  )}
                  {managedBooking.status === 'Checked In' && (
                    <div style={{ background: 'rgba(0,240,255,0.05)', border: '1px dashed var(--neon-blue)', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: 'var(--neon-blue)', textAlign: 'center' }}>
                      Session is active. For extensions or swaps, consult Matrix Gaming staff.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h3 className="font-gaming" style={{ fontSize: '0.95rem', color: 'var(--neon-blue)' }}>Reschedule Session</h3>
                  <div className="form-group">
                    <label className="form-label">New Date</label>
                    <input type="date" className="form-control" value={rescheduleDate} min={new Date().toISOString().split('T')[0]} onChange={e => setRescheduleDate(e.target.value)} />
                  </div>
                  <DualTimePicker
                    label="New Start Time"
                    value={`${String(rescheduleHour).padStart(2,'0')}:${String(rescheduleMin).padStart(2,'0')}`}
                    onChange={v => { setRescheduleHour(v.split(':')[0]); setRescheduleMin(v.split(':')[1]); }}
                  />
                  <DurationPicker value={rescheduleDuration} onChange={setRescheduleDuration} />
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>New End Time:</span>
                    <strong style={{ color: 'var(--neon-green)' }}>
                      {calculateEndTime(`${String(rescheduleHour).padStart(2,'0')}:${String(rescheduleMin).padStart(2,'0')}`, rescheduleDuration)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setRescheduleMode(false)} className="btn btn-secondary">Back</button>
                    <button onClick={handleReschedule} className="btn btn-neon-green">Confirm Reschedule</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          STICKY BOOKING FOOTER
      ════════════════════════════════════════ */}
      {showStickyFooter && (
        <div className="sticky-booking-footer">
          {bookingStep > 1 && (
            <button onClick={handlePrevStep} className="btn btn-secondary" style={{ maxWidth: '100px' }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {bookingStep < confirmStep && (
            <button
              onClick={handleNextStep}
              className={`btn ${bookingType === 'PC' ? 'btn-neon-blue' : 'btn-neon-purple'}`}
              disabled={bookingStep === 1 && !bookingType}
            >
              {bookingStep === 1 ? 'Start Booking' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          )}
          {bookingStep === confirmStep && (
            <button onClick={handleCompleteBooking} className="btn btn-neon-green">
              <Zap size={16} /> Confirm Booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}
