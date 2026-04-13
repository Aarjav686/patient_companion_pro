import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI, vitalsAPI } from '../../services/api';
import { formatDate } from '../../lib/utils';
import {
  CalendarCheck, ClipboardList, FlaskConical, Bell,
  Plus, ArrowRight, TrendingUp, TrendingDown,
  Calendar, Stethoscope, Pill, Activity, HeartPulse, X
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Vitals State
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    logged_date: new Date().toISOString().split('T')[0],
    bp_systolic: '', bp_diastolic: '', heart_rate: '', blood_sugar: '', weight: '', temperature: '', spo2: ''
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [res, vitalsRes] = await Promise.all([
        patientsAPI.getDashboard(),
        vitalsAPI.getVitals().catch(() => ({ data: [] }))
      ]);
      setDashboard(res.data);
      setVitals(vitalsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogVitals = async (e) => {
    e.preventDefault();
    setSavingVitals(true);
    try {
      const payload = [];
      Object.entries(vitalsForm).forEach(([key, value]) => {
        if (value && key !== 'logged_date') {
          payload.push({ metric_type: key, value: Number(value), recorded_at: vitalsForm.logged_date });
        }
      });
      if (payload.length > 0) {
        await vitalsAPI.logVitals(payload);
        // Reload data
        loadDashboard();
        setShowVitalsModal(false);
        setVitalsForm({ logged_date: new Date().toISOString().split('T')[0], bp_systolic: '', bp_diastolic: '', heart_rate: '', blood_sugar: '', weight: '', temperature: '', spo2: '' });
      }
    } catch (err) {
      alert(err.error || 'Failed to log vitals');
    } finally {
      setSavingVitals(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter stagger-children">
        <div className="dashboard-header skeleton" style={{ height: '60px', width: '40%', marginBottom: '16px' }}></div>
        <div className="dashboard-stats">
          {[1,2,3,4].map(i => <div key={i} className="stat-card skeleton" style={{ height: '120px' }}></div>)}
        </div>
        <div className="dashboard-grid">
          <div className="card skeleton" style={{ height: '350px' }}></div>
          <div className="card skeleton" style={{ height: '350px' }}></div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const healthTrend = dashboard?.healthTrend || {};

  // Chart configuration with gradients
  const createGradient = (ctx, chartArea, colorStart, colorEnd) => {
    if (!ctx) return colorStart;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  };

  const chartData = {
    labels: healthTrend.labels || [],
    datasets: [
      {
        label: 'AI Risk Score',
        data: healthTrend.riskScore || [],
        borderColor: 'hsl(280, 72%, 55%)',
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          return createGradient(ctx, chartArea, 'hsla(280, 72%, 55%, 0.4)', 'hsla(280, 72%, 55%, 0.0)');
        },
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'hsl(220, 10%, 65%)',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'hsl(222, 25%, 15%)',
        titleColor: '#fff',
        bodyColor: 'hsl(220, 10%, 75%)',
        borderColor: 'hsla(0,0%,100%,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { color: 'hsla(0,0%,100%,0.05)' },
        ticks: { color: 'hsl(220, 10%, 50%)', font: { size: 11 } },
      },
      y: {
        grid: { color: 'hsla(0,0%,100%,0.05)' },
        ticks: { color: 'hsl(220, 10%, 50%)', font: { size: 11 } },
      },
    },
  };

  // --- Vitals Chart Data Preparation ---
  const generateVitalsChartData = () => {
    // Group by timestamp/date and filter out invalid ones
    const validVitals = vitals.filter(v => {
      const d = new Date(v.recorded_at);
      return v.recorded_at && !isNaN(d.getTime());
    });
    const dates = [...new Set(validVitals.map(v => formatDate(v.recorded_at)))].filter(d => d !== '—').slice(-10); // last 10 points
    const datasets = {
      bpSys: [], bpDia: [], hr: [], sugar: []
    };
    
    dates.forEach(date => {
      const recordsForDate = vitals.filter(v => formatDate(v.recorded_at) === date);
      const getVal = (type) => recordsForDate.find(v => v.metric_type === type)?.value || null;
      
      datasets.bpSys.push(getVal('bp_systolic'));
      datasets.bpDia.push(getVal('bp_diastolic'));
      datasets.hr.push(getVal('heart_rate'));
      datasets.sugar.push(getVal('blood_sugar'));
    });

    return {
      labels: dates,
      datasets: [
        { label: 'Danger Line (Sys 140)', data: dates.map(()=>140), borderColor: 'rgba(255, 60, 60, 0.4)', borderDash: [5,5], pointRadius: 0, borderWidth: 2 },
        { label: 'Normal Target (Sys 120)', data: dates.map(()=>120), borderColor: 'rgba(60, 255, 60, 0.4)', borderDash: [5,5], pointRadius: 0, borderWidth: 2 },
        { label: 'BP Systolic', data: datasets.bpSys, borderColor: 'var(--color-danger)', tension: 0.3, pointRadius: 4 },
        { label: 'BP Diastolic', data: datasets.bpDia, borderColor: 'hsla(330, 80%, 60%)', tension: 0.3, pointRadius: 4 },
        { label: 'Heart Rate', data: datasets.hr, borderColor: 'var(--color-primary)', tension: 0.3, pointRadius: 4 },
        { label: 'Blood Sugar', data: datasets.sugar, borderColor: 'var(--color-accent)', tension: 0.3, pointRadius: 4 },
      ]
    };
  };

  const statCards = [
    {
      label: 'Upcoming Appointments',
      value: stats.upcomingAppointments || 0,
      icon: CalendarCheck,
      color: 'hsl(210, 78%, 55%)',
      bg: 'hsla(210, 78%, 55%, 0.12)',
      trend: '+2',
      trendDir: 'up',
    },
    {
      label: 'Active Prescriptions',
      value: stats.activePrescriptions || 0,
      icon: ClipboardList,
      color: 'hsl(165, 60%, 50%)',
      bg: 'hsla(165, 60%, 50%, 0.12)',
      trend: '0',
      trendDir: 'up',
    },
    {
      label: 'Pending Lab Tests',
      value: stats.pendingLabTests || 0,
      icon: FlaskConical,
      color: 'hsl(38, 92%, 55%)',
      bg: 'hsla(38, 92%, 55%, 0.12)',
      trend: '-1',
      trendDir: 'down',
    },
    {
      label: 'Unread Alerts',
      value: stats.unreadAlerts || 0,
      icon: Bell,
      color: 'hsl(0, 72%, 55%)',
      bg: 'hsla(0, 72%, 55%, 0.12)',
      trend: '+1',
      trendDir: 'up',
    },
  ];

  const getStatusClass = (status) => {
    return `status-badge ${status}`;
  };



  return (
    <div className="stagger-children">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's an overview of your health activity and upcoming schedule.</p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        {statCards.map((stat, i) => (
          <div
            className="stat-card"
            key={i}
            style={{ '--stat-color': stat.color, '--stat-bg': stat.bg }}
          >
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}>
                <stat.icon />
              </div>
              <span className={`stat-card-trend ${stat.trendDir}`}>
                {stat.trendDir === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {stat.trend}
              </span>
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">
              <HeartPulse size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-danger)' }} />
              Health Vitals Time-Series
            </h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Latest Logs</span>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            {vitals.length === 0 ? (
              <div className="empty-state">No vitals logged yet.</div>
            ) : (
              <Line data={generateVitalsChartData()} options={{...chartOptions, plugins: { legend: { position: 'bottom' }}}} />
            )}
          </div>
        </div>

        {/* Health Trends Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Activity size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
              Health Trends
            </h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Last 6 months</span>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button className="quick-action-btn" onClick={() => setShowVitalsModal(true)} style={{ background: 'var(--color-primary-bg)', borderColor: 'var(--color-primary)' }}>
                <HeartPulse size={18} style={{ color: 'var(--color-primary)' }}/> Log Today's Vitals
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/appointments')}>
                <Plus size={18} /> Book Appointment
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/prescriptions')}>
                <Pill size={18} /> View Prescriptions
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/lab-tests')}>
                <FlaskConical size={18} /> Lab Test Results
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/records')}>
                <Stethoscope size={18} /> Health Records
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments & Active Prescriptions */}
      <div className="dashboard-grid-equal">
        {/* Recent Appointments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Appointments</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.recentAppointments || []).length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>
                      No appointments yet
                    </td>
                  </tr>
                ) : (
                  dashboard.recentAppointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{apt.doctorName}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {apt.specialization}
                        </div>
                      </td>
                      <td>
                        <div>{formatDate(apt.date)}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {apt.time}
                        </div>
                      </td>
                      <td>
                        <span className={getStatusClass(apt.status)}>{apt.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Prescriptions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Prescriptions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/prescriptions')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body">
            {(dashboard?.activePrescriptions || []).length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <p className="empty-state-text">No active prescriptions</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {dashboard.activePrescriptions.map((rx) => (
                  <div key={rx.id} style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--color-accent)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                      {rx.diagnosis}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {rx.doctorName} • {rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {rx.medicines.map(m => m.name).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Today's Vitals</h3>
              <button className="modal-close" onClick={() => setShowVitalsModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLogVitals}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0, flex: 1 }}>
                    Enter your readings. Leave fields blank if unmeasured.
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="date" className="form-input form-input-sm" required max={new Date().toISOString().split('T')[0]} value={vitalsForm.logged_date} onChange={e => setVitalsForm({...vitalsForm, logged_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">BP Systolic</label>
                    <input type="number" className="form-input" placeholder="e.g. 120" value={vitalsForm.bp_systolic} onChange={e => setVitalsForm({...vitalsForm, bp_systolic: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">BP Diastolic</label>
                    <input type="number" className="form-input" placeholder="e.g. 80" value={vitalsForm.bp_diastolic} onChange={e => setVitalsForm({...vitalsForm, bp_diastolic: e.target.value})} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Heart Rate (bpm)</label>
                    <input type="number" className="form-input" placeholder="e.g. 72" value={vitalsForm.heart_rate} onChange={e => setVitalsForm({...vitalsForm, heart_rate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Sugar (mg/dL)</label>
                    <input type="number" className="form-input" placeholder="e.g. 140" value={vitalsForm.blood_sugar} onChange={e => setVitalsForm({...vitalsForm, blood_sugar: e.target.value})} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input type="number" step="0.1" className="form-input" placeholder="e.g. 70.5" value={vitalsForm.weight} onChange={e => setVitalsForm({...vitalsForm, weight: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SpO2 (%)</label>
                    <input type="number" className="form-input" placeholder="e.g. 98" value={vitalsForm.spo2} onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVitalsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingVitals}>
                  {savingVitals ? <span className="spinner spinner-sm"></span> : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
