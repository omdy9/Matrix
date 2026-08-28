import { formatRupees } from '../db/storage';
import type { Booking, Station } from '../db/storage';
import { TrendingUp, Users, Laptop, Gamepad, CreditCard, Trash2, Award } from 'lucide-react';

interface AnalyticsViewProps {
  bookings: Booking[];
  stations: Station[];
}

export default function AnalyticsView({ bookings, stations }: AnalyticsViewProps) {
  
  // 1. General Metrics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'Completed');
  const cancelledBookings = bookings.filter(b => b.status === 'Cancelled');
  const noShowBookings = bookings.filter(b => b.status === 'No Show');
  
  const cancellationRate = totalBookings > 0 
    ? Math.round((cancelledBookings.length / totalBookings) * 100) 
    : 0;

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  
  const averageTicket = completedBookings.length > 0 
    ? Math.round(totalRevenue / completedBookings.length) 
    : 0;

  // 2. Station Utilization (Number of completed + checked-in bookings per station)
  const stationCounts: Record<string, number> = {};
  stations.forEach(s => {
    stationCounts[s.name] = 0;
  });
  bookings.forEach(b => {
    if (b.status !== 'Cancelled') {
      const station = stations.find(s => s.id === b.stationId);
      if (station) {
        stationCounts[station.name] = (stationCounts[station.name] || 0) + 1;
      }
    }
  });

  const maxStationCount = Math.max(...Object.values(stationCounts), 1);

  // 3. Peak Booking Hours (Hour segment counts)
  // Map booking hours to: 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
  const hourlyCounts: Record<string, number> = {
    '10:00': 0, '12:00': 0, '14:00': 0, '16:00': 0, '18:00': 0, '20:00': 0, '22:00': 0
  };
  bookings.forEach(b => {
    if (b.status !== 'Cancelled') {
      const hour = b.startTime.split(':')[0];
      const hrNum = parseInt(hour, 10);
      
      // Bucket to nearest even hour
      let bucket = '10:00';
      if (hrNum >= 22) bucket = '22:00';
      else if (hrNum >= 20) bucket = '20:00';
      else if (hrNum >= 18) bucket = '18:00';
      else if (hrNum >= 16) bucket = '16:00';
      else if (hrNum >= 14) bucket = '14:00';
      else if (hrNum >= 12) bucket = '12:00';
      
      hourlyCounts[bucket] = (hourlyCounts[bucket] || 0) + 1;
    }
  });

  const maxHourCount = Math.max(...Object.values(hourlyCounts), 1);

  // 4. Payment Method breakdown
  const upiBookings = completedBookings.filter(b => b.paymentMethod === 'UPI');
  const cashBookings = completedBookings.filter(b => b.paymentMethod === 'Cash');
  const upiRevenue = upiBookings.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  const cashRevenue = cashBookings.reduce((sum, b) => sum + (b.finalAmount || 0), 0);

  // 5. Popularity Category
  const pcBookings = bookings.filter(b => b.status !== 'Cancelled' && b.segments.some(s => s.stationType === 'PC'));
  const ps5Bookings = bookings.filter(b => b.status !== 'Cancelled' && b.segments.some(s => s.stationType === 'PS5'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* Top Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--neon-green)', background: 'rgba(57,255,20,0.1)', padding: '12px', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL REVENUE</span>
            <div className="font-gaming" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatRupees(totalRevenue)}</div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>From {completedBookings.length} completed slots</span>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--neon-blue)', background: 'rgba(0,240,255,0.1)', padding: '12px', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL RESERVATIONS</span>
            <div className="font-gaming" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{totalBookings} BOOKINGS</div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>All checked and cancelled tickets</span>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--neon-purple)', background: 'rgba(189,0,255,0.1)', padding: '12px', borderRadius: '12px' }}>
            <Award size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AVG TICKET SIZE</span>
            <div className="font-gaming" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatRupees(averageTicket)}</div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Average spend per gamer checkout</span>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--neon-pink)', background: 'rgba(255,0,127,0.1)', padding: '12px', borderRadius: '12px' }}>
            <Trash2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CANCELLATION RATE</span>
            <div className="font-gaming" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{cancellationRate}%</div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{cancelledBookings.length} Cancelled &bull; {noShowBookings.length} No Shows</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* CHART 1: Station Utilization (Bar Chart) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="font-gaming" style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
            Station Bookings Utilization
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
            {Object.entries(stationCounts).map(([name, count]) => {
              const percentage = Math.round((count / maxStationCount) * 100);
              return (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>{name}</span>
                    <strong>{count} Sessions Booked</strong>
                  </div>
                  {/* SVG Bar */}
                  <svg width="100%" height="10" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <rect 
                      width={`${percentage}%`} 
                      height="10" 
                      fill="url(#barGradient)" 
                      rx="5"
                      style={{ transition: 'width 1s ease-in-out' }}
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--neon-purple)" />
                        <stop offset="100%" stopColor="var(--neon-blue)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Peak Gaming Hours (Line/Area Graphic) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="font-gaming" style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
            Peak Traffic Hours
          </h3>
          
          {/* Custom SVG line plot */}
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 500 200" width="100%" height="150" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0, 240, 255, 0.4)" />
                  <stop offset="100%" stopColor="rgba(0, 240, 255, 0)" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              
              {/* Render Area & Line Path */}
              {(() => {
                const hours = Object.keys(hourlyCounts);
                const points = hours.map((h, i) => {
                  const x = (i / (hours.length - 1)) * 500;
                  const count = hourlyCounts[h];
                  const y = 170 - (count / maxHourCount) * 140; // scale
                  return { x, y, count, label: h };
                });
                
                const linePath = points.map(p => `${p.x},${p.y}`).join(' L ');
                const areaPath = `0,170 L ${linePath} L 500,170 Z`;
                
                return (
                  <>
                    {/* Shaded Area */}
                    <path d={areaPath} fill="url(#areaGradient)" />
                    {/* Neon Line */}
                    <path d={`M ${linePath}`} fill="none" stroke="var(--neon-blue)" strokeWidth="3" style={{ filter: 'drop-shadow(0px 0px 5px rgba(0, 240, 255, 0.5))' }} />
                    
                    {/* Points & Labels */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#000" stroke="var(--neon-green)" strokeWidth="2" />
                        <text x={p.x} y={p.y - 10} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">
                          {p.count}
                        </text>
                        <text x={p.x} y="195" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          
          <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Peak operating segments parsed from bookings start schedule
          </p>
        </div>

        {/* CHART 3: Split stats - Payments & Platform */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '20px' }}>
          
          {/* Payment Methods */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 className="font-gaming" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Revenue Payment Distribution
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} color="var(--neon-blue)" /> UPI Transactions
                </span>
                <strong>{formatRupees(upiRevenue)} ({upiBookings.length} bookings)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} color="var(--neon-green)" /> Cash Handed
                </span>
                <strong>{formatRupees(cashRevenue)} ({cashBookings.length} bookings)</strong>
              </div>
            </div>
            
            {/* Visual ratio bar */}
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginTop: '4px', background: 'rgba(255,255,255,0.05)' }}>
              {totalRevenue > 0 ? (
                <>
                  <div style={{ width: `${(upiRevenue / totalRevenue) * 100}%`, background: 'var(--neon-blue)' }} title="UPI" />
                  <div style={{ width: `${(cashRevenue / totalRevenue) * 100}%`, background: 'var(--neon-green)' }} title="Cash" />
                </>
              ) : (
                <div style={{ width: '100%', background: 'var(--border-muted)' }} />
              )}
            </div>
          </div>

          {/* Platform Distribution (PC vs Console) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 className="font-gaming" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Platform Engagement Rate
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Laptop size={14} color="var(--neon-blue)" /> PC Gaming Slots
              </span>
              <strong>{pcBookings.length} bookings</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gamepad size={14} color="var(--neon-purple)" /> PlayStation 5 Slots
              </span>
              <strong>{ps5Bookings.length} bookings</strong>
            </div>

            {/* Visual engagement ratio bar */}
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginTop: '4px', background: 'rgba(255,255,255,0.05)' }}>
              {pcBookings.length + ps5Bookings.length > 0 ? (
                <>
                  <div style={{ width: `${(pcBookings.length / (pcBookings.length + ps5Bookings.length)) * 100}%`, background: 'var(--neon-blue)' }} />
                  <div style={{ width: `${(ps5Bookings.length / (pcBookings.length + ps5Bookings.length)) * 100}%`, background: 'var(--neon-purple)' }} />
                </>
              ) : (
                <div style={{ width: '100%', background: 'var(--border-muted)' }} />
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
