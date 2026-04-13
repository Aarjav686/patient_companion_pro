import { useState, useEffect } from 'react';
import { labTestsAPI, doctorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FlaskConical, Calendar, User, CheckCircle, Clock, AlertTriangle, Plus, X, Upload } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function LabTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedTest, setExpandedTest] = useState(null);
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    patientId: '', testName: '', category: 'Blood Test', priority: 'routine', notes: '', file: null
  });

  useEffect(() => { 
    loadTests();
    if (user?.role === 'doctor') {
      doctorsAPI.getPatients(user.id).then(res => setPatients(res.data));
    }
  }, []);

  const loadTests = async () => {
    try {
      const res = await labTestsAPI.getAll();
      setTests(res.data);
    } catch (err) {
      console.error('Failed to load lab tests:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async () => {
    if (!form.patientId || !form.testName) return alert('Patient and Test Name required');
    setUploading(true);
    try {
      await labTestsAPI.create(form, form.file);
      setShowUpload(false);
      setForm({ patientId: '', testName: '', category: 'Blood Test', priority: 'routine', notes: '', file: null });
      loadTests();
    } catch (err) {
      alert(err?.error || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Lab Tests & Reports</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Manage laboratory tests and view results</p>
        </div>
        {user?.role === 'doctor' && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={18} /> Upload Report
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {['all', 'pending', 'completed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <p className="empty-state-title">No lab tests found</p>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filtered.map(test => (
            <div className="card" key={test.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                      background: test.status === 'completed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: test.status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)',
                      flexShrink: 0,
                    }}>
                      {test.status === 'completed' ? <CheckCircle size={22} /> : <Clock size={22} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: '4px' }}>{test.test_name || test.testName}</h3>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        <span><User size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {user?.role === 'doctor' ? test.patientName : test.doctorName}</span>
                        <span><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {formatDate(test.ordered_at || test.orderedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>    
                    <span className={`status-badge ${test.status}`}>{test.status}</span>
                  </div>
                </div>

                {expandedTest === test.id && (
                  <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                    {test.report_url ? (
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <a href={test.report_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          <FlaskConical size={14}/> View Full Report
                        </a>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        Results pending upload.
                      </div>
                    )}
                    {test.notes && (
                      <div style={{ padding: 'var(--space-3)', background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                        <strong style={{ color: 'var(--color-info)' }}>Notes:</strong> {test.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Upload Lab Report</h3>
              <button className="modal-close" onClick={() => setShowUpload(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select className="form-select" value={form.patientId} onChange={e => setForm(p => ({ ...p, patientId: e.target.value }))}>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Test Name</label>
                <input className="form-input" value={form.testName} onChange={e => setForm(p => ({ ...p, testName: e.target.value }))} placeholder="e.g. Complete Blood Count" />
              </div>
              <div className="form-group">
                <label className="form-label">Report File (Optional)</label>
                <input type="file" className="form-input" onChange={e => setForm(p => ({ ...p, file: e.target.files[0] }))} accept=".pdf,image/*" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Save & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
