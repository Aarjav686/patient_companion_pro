import { useState, useEffect } from 'react';
import { appointmentsAPI } from '../../services/api';
import { Calendar, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    try {
      const res = await appointmentsAPI.getAll();
      setAppointments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await appointmentsAPI.update(id, { status });
      loadAppointments();
    } catch (err) { alert(err?.error || 'Failed'); }
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Manage Appointments</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Review, confirm, and manage patient appointments</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}
            {f !== 'all' && ` (${appointments.filter(a => a.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Date & Time</th><th>Type</th><th>Symptoms</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="empty-state"><p>No appointments found</p></td></tr>
              ) : filtered.map(apt => (
                <tr key={apt.id}>
                  <td><div style={{ fontWeight: 500 }}>{apt.patientName}</div></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatDate(apt.date)}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {apt.time}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{apt.type}</td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.symptoms || '-'}</td>
                  <td><span className={`status-badge ${apt.status}`}>{apt.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      {apt.status === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => updateStatus(apt.id, 'confirmed')} title="Confirm">
                            <CheckCircle size={14} />
                          </button>
                          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => updateStatus(apt.id, 'cancelled')} title="Decline">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <button className="btn btn-sm btn-accent" onClick={() => updateStatus(apt.id, 'completed')}>Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
