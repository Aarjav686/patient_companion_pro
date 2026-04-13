import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { prescriptionsAPI, appointmentsAPI } from '../../services/api';
import { Plus, X, Pill, Trash2, Calendar, User, Download } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function WritePrescription() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    patientId: '', patientName: '', appointmentId: '', diagnosis: '', advice: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rxRes, aptRes] = await Promise.all([prescriptionsAPI.getAll(), appointmentsAPI.getAll()]);
      setPrescriptions(rxRes.data);
      setAppointments(aptRes.data.filter(a => a.status === 'confirmed' || a.status === 'completed'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addMedicine = () => {
    setForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    }));
  };

  const removeMedicine = (index) => {
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const updateMedicine = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => i === index ? { ...m, [field]: value } : m),
    }));
  };

  const selectAppointment = (aptId) => {
    const apt = appointments.find(a => a.id === aptId);
    if (apt) {
      setForm(prev => ({
        ...prev,
        appointmentId: aptId,
        patientId: apt.patientId,
        patientName: apt.patientName,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.diagnosis || form.medicines.some(m => !m.name)) {
      alert('Please fill patient, diagnosis, and at least one medicine name.');
      return;
    }
    try {
      await prescriptionsAPI.create(form);
      setShowForm(false);
      setForm({
        patientId: '', patientName: '', appointmentId: '', diagnosis: '', advice: '',
        medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      });
      loadData();
    } catch (err) { alert(err?.error || 'Failed'); }
  };

  const handlePrint = (rx) => {
    const win = window.open('', '_blank', 'width=800,height=900');
    const medicines = (rx.medicines || []).map((m, i) => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:8px 4px;font-weight:600">${i + 1}. ${m.name}</td>
        <td style="padding:8px 4px;color:#555">${m.dosage || '—'}</td>
        <td style="padding:8px 4px;color:#555">${m.duration || '—'}</td>
        <td style="padding:8px 4px;color:#555;font-size:12px">${m.instructions || '—'}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Prescription — ${rx.diagnosis}</title>
      <style>
        * {margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;padding:40px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #6c3de0;margin-bottom:24px}
        .clinic-name{font-size:22px;font-weight:800;color:#6c3de0}
        .clinic-sub{font-size:12px;color:#666;margin-top:4px}
        .rx-symbol{font-size:48px;color:#6c3de0;font-weight:900;line-height:1}
        .section{margin-bottom:20px}
        .section-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px;font-weight:700}
        .patient-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;background:#f8f6ff;padding:14px 18px;border-radius:8px}
        .patient-field label{font-size:11px;color:#999;display:block}
        .patient-field span{font-size:14px;font-weight:600}
        .diagnosis-box{background:#f0ebff;border-left:4px solid #6c3de0;padding:12px 16px;border-radius:4px;font-size:16px;font-weight:700;color:#3a1a8a}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#999;padding:6px 4px;border-bottom:2px solid #eee}
        .advice-box{background:#e8f4ff;border-left:4px solid #2196F3;padding:12px 16px;border-radius:4px;font-size:13px;color:#1a4d7a}
        .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-end}
        .signature-line{border-top:1px solid #333;width:180px;text-align:center;padding-top:4px;font-size:12px;color:#666}
        .disclaimer{font-size:10px;color:#aaa;margin-top:8px;font-style:italic}
      </style></head><body>
      <div class="header">
        <div>
          <div class="clinic-name">Patient Companion Pro</div>
          <div class="clinic-sub">AI-Powered Healthcare Management</div>
          <div class="clinic-sub" style="margin-top:10px;font-weight:600;font-size:14px;color:#333">${user?.name}</div>
          <div class="clinic-sub">${user?.qualification || ''} · ${user?.specialization || ''}</div>
          <div class="clinic-sub">${user?.hospital || ''}</div>
        </div>
        <div class="rx-symbol">℞</div>
      </div>
      <div class="section">
        <div class="section-title">Patient Details</div>
        <div class="patient-grid">
          <div class="patient-field"><label>Patient Name</label><span>${rx.patientName || '—'}</span></div>
          <div class="patient-field"><label>Date Issued</label><span>${formatDate(rx.createdAt)}</span></div>
          <div class="patient-field"><label>Status</label><span style="color:#6c3de0;text-transform:capitalize">${rx.status}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Diagnosis</div>
        <div class="diagnosis-box">${rx.diagnosis}</div>
      </div>
      <div class="section">
        <div class="section-title">Prescribed Medicines</div>
        <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr></thead>
        <tbody>${medicines}</tbody></table>
      </div>
      ${rx.advice ? `<div class="section"><div class="section-title">Doctor's Advice</div><div class="advice-box">${rx.advice}</div></div>` : ''}
      <div class="footer">
        <div><div class="signature-line">${user?.name}<br/>Signature &amp; Seal</div></div>
        <div style="text-align:right">
          <div style="font-size:12px;color:#666">Reg. No: PCPRO-2026</div>
          <div class="disclaimer">Computer-generated prescription — Patient Companion Pro</div>
          <div class="disclaimer">Consult your physician before changing any medication.</div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>Prescriptions</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Write and manage patient prescriptions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Write Prescription</button>
      </div>

      {/* Existing Prescriptions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {prescriptions.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">No prescriptions yet</p>
          </div></div>
        ) : prescriptions.map(rx => (
          <div className="prescription-card" key={rx.id}>
            <div className="prescription-header">
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '4px' }}>{rx.diagnosis}</h3>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <span><User size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {rx.patientName}</span>
                  <span><Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {formatDate(rx.createdAt)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className={`status-badge ${rx.status}`}>{rx.status}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Export PDF"
                  onClick={() => handlePrint(rx)}
                  style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="medicine-list">
              {rx.medicines.map((med, i) => (
                <div className="medicine-item" key={i}>
                  <div className="medicine-name">{med.name}</div>
                  <div className="medicine-details">
                    <span>{med.dosage}</span><span>{med.frequency}</span><span>{med.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Write Prescription Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Write New Prescription</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Appointment / Patient</label>
                <select className="form-select" value={form.appointmentId} onChange={e => selectAppointment(e.target.value)}>
                  <option value="">Choose appointment...</option>
                  {appointments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.patientName} — {formatDate(apt.date)} ({apt.symptoms || apt.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Diagnosis</label>
                <input className="form-input" placeholder="Enter diagnosis" value={form.diagnosis}
                  onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <label className="form-label" style={{ margin: 0 }}>Medicines</label>
                  <button className="btn btn-sm btn-secondary" onClick={addMedicine}><Plus size={14} /> Add</button>
                </div>
                {form.medicines.map((med, i) => (
                  <div key={i} style={{
                    padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)',
                    borderLeft: '3px solid var(--color-primary)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <input className="form-input" placeholder="Medicine name" value={med.name}
                        onChange={e => updateMedicine(i, 'name', e.target.value)}
                        style={{ background: 'var(--color-bg-secondary)' }} />
                      {form.medicines.length > 1 && (
                        <button className="btn btn-icon btn-ghost" onClick={() => removeMedicine(i)} style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-2)' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                      <input className="form-input" placeholder="Dosage" value={med.dosage}
                        onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)', background: 'var(--color-bg-secondary)' }} />
                      <input className="form-input" placeholder="Frequency" value={med.frequency}
                        onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)', background: 'var(--color-bg-secondary)' }} />
                      <input className="form-input" placeholder="Duration" value={med.duration}
                        onChange={e => updateMedicine(i, 'duration', e.target.value)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)', background: 'var(--color-bg-secondary)' }} />
                      <input className="form-input" placeholder="Instructions" value={med.instructions}
                        onChange={e => updateMedicine(i, 'instructions', e.target.value)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)', background: 'var(--color-bg-secondary)' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Advice / Instructions</label>
                <textarea className="form-textarea" placeholder="Additional advice for the patient..."
                  value={form.advice} onChange={e => setForm(p => ({ ...p, advice: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Save Prescription</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
