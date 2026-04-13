import { useState, useEffect } from 'react';
import { doctorAvailabilityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Clock, Save, Trash2, Plus, 
  CheckCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import { DAY_NAMES } from '../../lib/utils';

export default function Schedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const res = await doctorAvailabilityAPI.getMySchedule();
      setSchedule(res.data || []);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateDay = (dayIndex, field, value) => {
    setSchedule(prev => {
      const existing = prev.find(s => s.day_of_week === dayIndex);
      if (existing) {
        return prev.map(s => s.day_of_week === dayIndex ? { ...s, [field]: value } : s);
      } else {
        // Default values for a new day entry
        return [...prev, { 
          day_of_week: dayIndex, 
          start_time: '09:00', 
          end_time: '17:00', 
          slot_duration_minutes: 30, 
          is_active: true,
          ... { [field]: value }
        }];
      }
    });
  };

  const handleToggleDay = (dayIndex) => {
    setSchedule(prev => {
      const existing = prev.find(s => s.day_of_week === dayIndex);
      if (existing) {
        return prev.map(s => s.day_of_week === dayIndex ? { ...s, is_active: !s.is_active } : s);
      } else {
        return [...prev, { 
          day_of_week: dayIndex, 
          start_time: '09:00', 
          end_time: '17:00', 
          slot_duration_minutes: 30, 
          is_active: true 
        }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await doctorAvailabilityAPI.upsert(schedule);
      showToast('Schedule updated successfully!');
    } catch (err) {
      showToast(err?.error || 'Failed to save schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="page-enter stagger-children">
      {toast && (
        <div className={`toast ${toast.type}`} style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 1000 }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Manage Availability</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Set your working hours and appointment slot duration.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ gap: '8px' }}
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Weekly Working Hours</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Day</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th>Hours (Start - End)</th>
                  <th style={{ width: '150px' }}>Slot Duration</th>
                </tr>
              </thead>
              <tbody>
                {DAY_NAMES.map((dayName, index) => {
                  const dayEntry = schedule.find(s => s.day_of_week === index);
                  const isActive = dayEntry?.is_active ?? false;

                  return (
                    <tr key={index} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600 }}>{dayName}</td>
                      <td>
                        <button 
                          className={`btn btn-sm ${isActive ? 'btn-success' : 'btn-secondary'}`}
                          onClick={() => handleToggleDay(index)}
                          style={{ minWidth: '80px', fontSize: '11px' }}
                        >
                          {isActive ? 'Active' : 'Off'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <input 
                            type="time" 
                            className="form-input" 
                            style={{ width: '130px', padding: '6px 10px' }}
                            value={dayEntry?.start_time || '09:00'}
                            disabled={!isActive}
                            onChange={(e) => handleUpdateDay(index, 'start_time', e.target.value)}
                          />
                          <span style={{ color: 'var(--color-text-muted)' }}>to</span>
                          <input 
                            type="time" 
                            className="form-input" 
                            style={{ width: '130px', padding: '6px 10px' }}
                            value={dayEntry?.end_time || '17:00'}
                            disabled={!isActive}
                            onChange={(e) => handleUpdateDay(index, 'end_time', e.target.value)}
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select 
                            className="form-select" 
                            style={{ padding: '6px 30px 6px 12px', fontSize: '13px' }}
                            value={dayEntry?.slot_duration_minutes || 30}
                            disabled={!isActive}
                            onChange={(e) => handleUpdateDay(index, 'slot_duration_minutes', parseInt(e.target.value))}
                          >
                            <option value={15}>15 mins</option>
                            <option value={30}>30 mins</option>
                            <option value={45}>45 mins</option>
                            <option value={60}>60 mins</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <Clock size={32} style={{ color: 'var(--color-info)' }} />
            <div>
              <h4 style={{ marginBottom: '4px' }}>Automatic Slot Generation</h4>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                System will automatically divide your working hours into booking slots for patients.
              </p>
            </div>
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
            <div>
              <h4 style={{ marginBottom: '4px' }}>Conflict Prevention</h4>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Booked appointments will be automatically filtered out from your available list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
