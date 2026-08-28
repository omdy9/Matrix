import { updateStationStatus } from '../db/storage';
import type { Station, StationStatus } from '../db/storage';
import { Laptop, Gamepad, AlertTriangle, CheckCircle } from 'lucide-react';

interface StationConfigProps {
  stations: Station[];
  onUpdate: () => void;
}

export default function StationConfig({ stations, onUpdate }: StationConfigProps) {
  
  const handleToggleMaintenance = (station: Station) => {
    const isMaintenance = station.status === 'Maintenance';
    const newStatus: StationStatus = isMaintenance ? 'Available' : 'Maintenance';
    
    const actionText = isMaintenance 
      ? `Mark ${station.name} as available?` 
      : `Put ${station.name} into maintenance? This will block new customer bookings.`;

    if (window.confirm(actionText)) {
      updateStationStatus(station.id, newStatus);
      onUpdate();
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="font-gaming" style={{ fontSize: '1.1rem' }}>Parlour Station Management</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>
            Monitor real-time hardware status and toggle maintenance windows
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-available)' }} />
            Free
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-booked)' }} />
            Booked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-inuse)' }} />
            In Play
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-maintenance)' }} />
            Repair
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {stations.map(station => {
          const isPC = station.type === 'PC';
          const isMaintenance = station.status === 'Maintenance';
          const isInUse = station.status === 'In Use';
          
          return (
            <div 
              key={station.id} 
              className={`glass-card ${
                station.status === 'Available' ? 'neon-green-hover' :
                station.status === 'Booked' || isInUse ? 'neon-blue-hover' :
                isMaintenance ? 'neon-purple-hover' : 'neon-blue-hover'
              }`}
              style={{
                padding: '20px',
                border: `1px solid ${
                  station.status === 'Available' ? 'rgba(16, 185, 129, 0.2)' :
                  station.status === 'Booked' ? 'rgba(245, 158, 11, 0.2)' :
                  isInUse ? 'rgba(236, 72, 153, 0.2)' :
                  'rgba(107, 114, 128, 0.3)'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                position: 'relative'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isPC ? (
                    <Laptop size={20} color={isMaintenance ? 'var(--text-muted)' : 'var(--neon-blue)'} />
                  ) : (
                    <Gamepad size={20} color={isMaintenance ? 'var(--text-muted)' : 'var(--neon-purple)'} />
                  )}
                  <h4 style={{ margin: 0, color: isMaintenance ? 'var(--text-muted)' : '#fff' }}>
                    {station.name}
                  </h4>
                </div>
                <span className={`badge ${
                  station.status === 'Available' ? 'badge-available' :
                  station.status === 'Booked' ? 'badge-booked' :
                  isInUse ? 'badge-inuse' : 'badge-maintenance'
                }`}>
                  {station.status}
                </span>
              </div>

              {/* Specs & Info */}
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Hourly Rate:</span>
                  <strong style={{ color: isMaintenance ? 'var(--text-muted)' : 'var(--neon-green)' }}>
                    ₹{station.hourlyRate}/hr
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hardware Type:</span>
                  <span>{isPC ? 'RTX Gaming Rig' : 'Console (1 Controller)'}</span>
                </div>
              </div>

              {/* Maintenance Toggle Button */}
              <button
                onClick={() => handleToggleMaintenance(station)}
                className={`btn ${isMaintenance ? 'btn-neon-green' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '8px 12px',
                  borderColor: isMaintenance ? 'var(--neon-green)' : 'rgba(239, 68, 68, 0.2)',
                  color: isMaintenance ? 'var(--bg-primary)' : '#ef4444',
                  marginTop: '4px'
                }}
              >
                {isMaintenance ? (
                  <>
                    <CheckCircle size={14} /> Enable Station
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> Disable (Maintenance)
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
