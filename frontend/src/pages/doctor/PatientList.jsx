import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorsAPI } from '../../services/api';
import { User, Calendar, Phone, Droplets, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function PatientList() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    try {
      const res = await doctorsAPI.getPatients(user.id);
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : patients;



  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>My Patients</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{patients.length} patient{patients.length !== 1 ? 's' : ''} under your care</p>
        </div>
        <div className="topbar-search" style={{ width: '260px' }}>
          <input type="text" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <p className="empty-state-title">No patients found</p>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
          {filtered.map(patient => (
            <div className="card" key={patient.id}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 'var(--font-size-lg)', flexShrink: 0,
                  }}>
                    {patient.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)' }}>{patient.name}</h3>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {patient.age ? `${patient.age} yrs` : 'N/A'} • {patient.gender || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                  {patient.bloodGroup && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
                      <Droplets size={12} /> {patient.bloodGroup}
                    </span>
                  )}
                  {patient.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      <Phone size={12} /> {patient.phone}
                    </span>
                  )}
                </div>

                {patient.allergies?.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                    <AlertTriangle size={12} style={{ color: 'var(--color-danger)' }} />
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="status-badge critical" style={{ fontSize: '10px' }}>{a}</span>
                    ))}
                  </div>
                )}

                {patient.adherence !== undefined && patient.adherence !== null && (
                  <div style={{ 
                    marginBottom: 'var(--space-3)', 
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)' 
                  }}>
                    <span className={`status-badge ${patient.adherence >= 80 ? 'active' : patient.adherence >= 50 ? 'pending' : 'critical'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                      {patient.adherence}% Adherence ({patient.adherenceFraction} doses)
                    </span>
                    {patient.adherence < 50 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-danger)' }}>Non-compliant</span>
                    )}
                  </div>
                )}

                {patient.lastAppointment && (
                  <div style={{
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Calendar size={12} /> Last visit: {formatDate(patient.lastAppointment.date)} — {patient.lastAppointment.symptoms || 'Routine'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
