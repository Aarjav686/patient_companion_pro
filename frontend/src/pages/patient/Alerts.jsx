import { useState, useEffect } from 'react';
import { patientsAPI } from '../../services/api';
import { Bell, CheckCircle, AlertTriangle, Info, AlertCircle, Pill, X } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const severityConfig = {
    info: { icon: Info, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    warning: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    critical: { icon: AlertCircle, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  };

  const formatDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
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
          {unread.map(alert => {
            const cfg = severityConfig[alert.severity] || severityConfig.info;
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className="card" style={{ borderLeft: `3px solid ${cfg.color}`, cursor: 'pointer' }}
                onClick={() => markRead(alert.id)}>
                <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cfg.color, flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>{alert.title}</div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{alert.message}</p>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(alert.createdAt)}</span>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: '6px' }} />
                </div>
              </div>
            );
          })}

          {read.length > 0 && (
            <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' }}>
              Earlier
            </h3>
          )}
          {read.map(alert => {
            const cfg = severityConfig[alert.severity] || severityConfig.info;
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className="card" style={{ opacity: 0.7 }}>
                <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cfg.color, flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>{alert.title}</div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{alert.message}</p>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(alert.createdAt)}</span>
                  </div>
                  <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '4px' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
