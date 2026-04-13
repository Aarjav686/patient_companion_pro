import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI } from '../../services/api';
import { FileText, Calendar, Stethoscope, Pill, FlaskConical, Clock, User } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function Records() {
  const { user } = useAuth();
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const res = await patientsAPI.getRecords(user.id);
      setRecords(res.data);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };



  const typeIcon = { appointment: Calendar, prescription: Pill, labTest: FlaskConical };
  const typeColor = {
    appointment: 'var(--color-primary)',
    prescription: 'var(--color-accent)',
    labTest: 'var(--color-warning)',
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading health records...</p></div>;

  const patient = records?.patient;
  const summary = records?.summary;
  const timeline = records?.timeline || [];

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Health Records</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Complete health timeline and medical history
        </p>
      </div>

      {/* Patient Profile Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 'var(--font-size-2xl)', fontWeight: 700, flexShrink: 0,
            }}>
              {patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '4px' }}>{patient?.name}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>Age: {patient?.age || 'N/A'}</span>
                <span>Gender: {patient?.gender || 'N/A'}</span>
                <span>Blood Group: {patient?.bloodGroup || 'N/A'}</span>
                <span>Phone: {patient?.phone || 'N/A'}</span>
              </div>
              {patient?.allergies?.length > 0 && (
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>Allergies:</span>
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="status-badge critical">{a}</span>
                  ))}
                </div>
              )}
              {patient?.chronicConditions?.length > 0 && (
                <div style={{ marginTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>Conditions:</span>
                  {patient.chronicConditions.map((c, i) => (
                    <span key={i} className="status-badge high">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Appointments', value: summary?.totalAppointments || 0, icon: Calendar, color: 'var(--color-primary)' },
          { label: 'Completed Visits', value: summary?.completedAppointments || 0, icon: Stethoscope, color: 'var(--color-success)' },
          { label: 'Prescriptions', value: summary?.totalPrescriptions || 0, icon: Pill, color: 'var(--color-accent)' },
          { label: 'Lab Tests', value: summary?.totalLabTests || 0, icon: FlaskConical, color: 'var(--color-warning)' },
        ].map((stat, i) => (
          <div className="stat-card" key={i} style={{ '--stat-color': stat.color }}>
            <div className="stat-card-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="stat-card-value" style={{ marginTop: 'var(--space-3)' }}>{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Health Timeline */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Clock size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Health Timeline</h3>
        </div>
        <div className="card-body">
          {timeline.length === 0 ? (
            <div className="empty-state"><p className="empty-state-title">No records yet</p></div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 'var(--space-8)' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: '15px', top: 0, bottom: 0, width: '2px',
                background: 'var(--color-border)',
              }} />

              {timeline.map((entry, i) => {
                const Icon = typeIcon[entry.type] || FileText;
                const color = typeColor[entry.type] || 'var(--color-primary)';
                return (
                  <div key={i} style={{
                    position: 'relative', marginBottom: 'var(--space-5)',
                    paddingLeft: 'var(--space-4)',
                  }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: '-24px', top: '4px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: color, border: '2px solid var(--color-bg-secondary)',
                    }} />

                    <div style={{
                      padding: 'var(--space-4)',
                      background: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Icon size={16} style={{ color }} />
                          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{entry.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                          <span className={`status-badge ${entry.status}`}>{entry.status}</span>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(entry.date)}</span>
                        </div>
                      </div>
                      {entry.detail && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{entry.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
