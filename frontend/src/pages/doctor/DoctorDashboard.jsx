import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI, doctorsAPI, prescriptionsAPI, labTestsAPI } from '../../services/api';
import { CalendarCheck, Users, ClipboardList, FlaskConical, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ appointments: [], patients: [], prescriptions: [], labTests: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [aptRes, rxRes, ltRes] = await Promise.all([
        appointmentsAPI.getAll(),
        prescriptionsAPI.getAll(),
        labTestsAPI.getAll(),
      ]);
      setData({
        appointments: aptRes.data,
        prescriptions: rxRes.data,
        labTests: ltRes.data,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="page-enter stagger-children">
      <div className="dashboard-header skeleton" style={{ height: '60px', width: '40%', marginBottom: '16px' }}></div>
      <div className="dashboard-stats">
        {[1,2,3,4].map(i => <div key={i} className="stat-card skeleton" style={{ height: '120px' }}></div>)}
      </div>
      <div className="dashboard-grid-equal">
        <div className="card skeleton" style={{ height: '400px' }}></div>
        <div className="card skeleton" style={{ height: '400px' }}></div>
      </div>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const todayApts = data.appointments.filter(a => a.date === today && a.status !== 'cancelled');
  const pendingApts = data.appointments.filter(a => a.status === 'pending');
  const uniquePatients = [...new Set(data.appointments.map(a => a.patientId))];

  const stats = [
    { label: "Today's Appointments", value: todayApts.length, icon: CalendarCheck, color: 'hsl(210, 78%, 55%)' },
    { label: 'Pending Approvals', value: pendingApts.length, icon: Clock, color: 'hsl(38, 92%, 55%)' },
    { label: 'Total Patients', value: uniquePatients.length, icon: Users, color: 'hsl(165, 60%, 50%)' },
    { label: 'Prescriptions Written', value: data.prescriptions.length, icon: ClipboardList, color: 'hsl(280, 60%, 55%)' },
  ];

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentsAPI.update(id, { status });
      loadData();
    } catch (err) {
      alert(err?.error || 'Failed to update');
    }
  };



  return (
    <div className="stagger-children">
      <div className="dashboard-header">
        <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name} 🩺</h1>
        <p>Here's your clinical overview for today.</p>
      </div>

      <div className="dashboard-stats">
        {stats.map((stat, i) => (
          <div className="stat-card" key={i} style={{ '--stat-color': stat.color }}>
            <div className="stat-card-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="stat-card-value" style={{ marginTop: 'var(--space-3)' }}>{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid-equal">
        {/* Today's Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Schedule</h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{today}</span>
          </div>
          <div className="card-body">
            {todayApts.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <p className="empty-state-title">No appointments today</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {todayApts.sort((a,b) => a.time.localeCompare(b.time)).map(apt => (
                  <div key={apt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{
                      padding: 'var(--space-2) var(--space-3)', background: 'var(--color-primary-bg)',
                      borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-primary)', minWidth: '56px', textAlign: 'center',
                    }}>{apt.time}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{apt.patientName}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{apt.type} • {apt.symptoms || 'No symptoms noted'}</div>
                    </div>
                    <span className={`status-badge ${apt.status}`}>{apt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Approvals</h3>
            <span className="status-badge pending">{pendingApts.length}</span>
          </div>
          <div className="card-body">
            {pendingApts.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <CheckCircle size={32} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-2)' }} />
                <p className="empty-state-title">All caught up!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingApts.slice(0, 5).map(apt => (
                  <div key={apt.id} style={{
                    padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-warning)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{apt.patientName}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(apt.date)} at {apt.time}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(apt.id, 'confirmed')}>
                        Confirm
                      </button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
