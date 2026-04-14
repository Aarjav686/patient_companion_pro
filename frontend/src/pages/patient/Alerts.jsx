import { useState, useEffect } from 'react';
import { patientsAPI, bloodBankAPI } from '../../services/api';
import { Bell, CheckCircle, AlertTriangle, Info, AlertCircle, Pill, X, Droplet, HeartPulse } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null); // Track which alert is being accepted

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [resAlerts, resReminders] = await Promise.all([
        patientsAPI.getAlerts(),
        patientsAPI.getMedicineReminders()
      ]);
      setAlerts(resAlerts.data);
      setReminders(resReminders.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await patientsAPI.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReminderAction = async (id, status) => {
    try {
      await patientsAPI.updateReminderStatus(id, status);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error(err);
      alert('Failed to update reminder.');
    }
  };

  // --- Blood Emergency Accept Handler ---
  const parseAlertMetadata = (alert) => {
    try {
      if (alert.metadata) return JSON.parse(alert.metadata);
    } catch { /* ignore parse errors */ }
    return null;
  };

  const handleAcceptBlood = async (alertItem) => {
    const meta = parseAlertMetadata(alertItem);
    if (!meta?.request_id) return;
    
    setAcceptingId(alertItem.id);
    try {
      await bloodBankAPI.acceptBloodRequest(meta.request_id, meta.hospital);
      // Mark alert as read and update UI to show "Accepted" state
      await patientsAPI.markAlertRead(alertItem.id);
      setAlerts(prev => prev.map(a => 
        a.id === alertItem.id ? { ...a, read: true, _accepted: true } : a
      ));
    } catch (err) {
      alert(err.error || 'Failed to accept. The request may already be fulfilled.');
    } finally {
      setAcceptingId(null);
    }
  };

  const severityConfig = {
    info: { icon: Info, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    warning: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    critical: { icon: AlertCircle, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const unread = alerts.filter(a => !a.read);
  const read = alerts.filter(a => a.read);

  // Reminders for today that are pending
  const todayMs = new Date();
  todayMs.setHours(23, 59, 59, 999);
  const pendingReminders = reminders.filter(r => 
    r.status === 'pending' && 
    new Date(r.scheduled_time).getTime() < todayMs.getTime()
  );

  // --- Render a single alert card ---
  const renderAlertCard = (alert, isUnread) => {
    const cfg = severityConfig[alert.severity] || severityConfig.info;
    const Icon = cfg.icon;
    const meta = parseAlertMetadata(alert);
    const isBloodEmergency = meta?.type === 'blood_emergency';
    const isAccepted = alert._accepted;
    const isAccepting = acceptingId === alert.id;

    return (
      <div
        key={alert.id}
        className="card"
        style={{
          borderLeft: `3px solid ${cfg.color}`,
          cursor: isUnread && !isBloodEmergency ? 'pointer' : 'default',
          opacity: isUnread ? 1 : 0.7,
        }}
        onClick={() => isUnread && !isBloodEmergency && markRead(alert.id)}
      >
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
            background: isBloodEmergency ? 'var(--color-danger-bg)' : cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isBloodEmergency ? 'var(--color-danger)' : cfg.color, flexShrink: 0,
          }}>
            {isBloodEmergency ? <Droplet size={20} /> : <Icon size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>
              {alert.title}
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              {alert.message}
            </p>

            {/* Blood Emergency: Show hospital and blood group badges */}
            {isBloodEmergency && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <span className="status-badge critical" style={{ fontSize: '11px' }}>
                  <Droplet size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {meta.blood_group}
                </span>
                <span className="status-badge" style={{ fontSize: '11px', background: 'var(--color-bg-tertiary)' }}>
                  🏥 {meta.hospital}
                </span>
              </div>
            )}

            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {formatDate(alert.created_at || alert.createdAt)}
            </span>

            {/* Accept / Accepted button for blood emergency */}
            {isBloodEmergency && !isAccepted && !alert.read && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-sm"
                  disabled={isAccepting}
                  onClick={(e) => { e.stopPropagation(); handleAcceptBlood(alert); }}
                  style={{
                    background: 'linear-gradient(135deg, #e53e3e, #c53030)',
                    color: 'white',
                    fontWeight: 600,
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: isAccepting ? 'wait' : 'pointer',
                    opacity: isAccepting ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!isAccepting) e.target.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                >
                  <HeartPulse size={16} />
                  {isAccepting ? 'Accepting...' : 'Accept & Volunteer'}
                </button>
              </div>
            )}

            {/* Show accepted state */}
            {(isAccepted || (isBloodEmergency && alert.read)) && isBloodEmergency && (
              <div style={{
                marginTop: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-success)',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
              }}>
                <CheckCircle size={16} />
                {isAccepted ? 'Accepted — Thank you for volunteering!' : 'Responded'}
              </div>
            )}
          </div>
          
          {/* Unread indicator dot (non-blood alerts) */}
          {isUnread && !isBloodEmergency && (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: '6px' }} />
          )}
          {!isUnread && !isBloodEmergency && (
            <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '4px' }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Alerts & Notifications</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {unread.length} unread notification{unread.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Medication Reminders Segment */}
      {pendingReminders.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
            Medication Due Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {pendingReminders.map(r => (
              <div key={r.id} className="card" style={{ borderLeft: '4px solid var(--color-primary)', borderRight: '1px solid var(--color-border)' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <div style={{ padding: '10px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', borderRadius: '50%' }}>
                      <Pill size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', marginBottom: '2px' }}>{r.medicine_name}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        Scheduled for: {new Date(r.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-sm" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }} onClick={() => handleReminderAction(r.id, 'taken')}>
                      <CheckCircle size={16} /> Taken
                    </button>
                    <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => handleReminderAction(r.id, 'skipped')}>
                      <X size={16} /> Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && pendingReminders.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <p className="empty-state-title">No notifications</p>
          <p className="empty-state-text">You're all caught up!</p>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {unread.length > 0 && (
            <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
              New
            </h3>
          )}
          {unread.map(alert => renderAlertCard(alert, true))}

          {read.length > 0 && (
            <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' }}>
              Earlier
            </h3>
          )}
          {read.map(alert => renderAlertCard(alert, false))}
        </div>
      )}
    </div>
  );
}
