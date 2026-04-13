import { useState, useEffect, useRef } from 'react';
import { prescriptionsAPI } from '../../services/api';
import { Pill, Calendar, User, Download, Printer } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const res = await prescriptionsAPI.getAll();
      setPrescriptions(res.data);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? prescriptions : prescriptions.filter(p => p.status === filter);
  const printRef = useRef(null);

  const handlePrint = (rx) => {
    printRef.current = rx;
    // Build a standalone print window
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
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background:#fff; padding:40px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:3px solid #6c3de0; margin-bottom:24px; }
        .clinic-name { font-size:22px; font-weight:800; color:#6c3de0; }
        .clinic-sub { font-size:12px; color:#666; margin-top:4px; }
        .rx-symbol { font-size:48px; color:#6c3de0; font-weight:900; line-height:1; }
        .section { margin-bottom:20px; }
        .section-title { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#999; margin-bottom:8px; font-weight:700; }
        .patient-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; background:#f8f6ff; padding:14px 18px; border-radius:8px; }
        .patient-field label { font-size:11px; color:#999; display:block; }
        .patient-field span { font-size:14px; font-weight:600; }
        .diagnosis-box { background:#f0ebff; border-left:4px solid #6c3de0; padding:12px 16px; border-radius:4px; font-size:16px; font-weight:700; color:#3a1a8a; }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#999; padding:6px 4px; border-bottom:2px solid #eee; }
        .advice-box { background:#e8f4ff; border-left:4px solid #2196F3; padding:12px 16px; border-radius:4px; font-size:13px; color:#1a4d7a; }
        .footer { margin-top:40px; padding-top:16px; border-top:1px solid #eee; display:flex; justify-content:space-between; align-items:flex-end; }
        .signature-line { border-top:1px solid #333; width:180px; text-align:center; padding-top:4px; font-size:12px; color:#666; }
        .disclaimer { font-size:10px; color:#aaa; margin-top:8px; font-style:italic; }
        .date-issued { font-size:12px; color:#666; }
        @media print { body { padding:20px; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="clinic-name">Patient Companion Pro</div>
          <div class="clinic-sub">AI-Powered Healthcare Management</div>
          <div class="clinic-sub" style="margin-top:10px;font-weight:600;font-size:14px;color:#333">${rx.doctorName || 'Attending Physician'}</div>
        </div>
        <div class="rx-symbol">℞</div>
      </div>
      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="patient-grid">
          <div class="patient-field"><label>Patient Name</label><span>${rx.patientName || 'Patient'}</span></div>
          <div class="patient-field"><label>Date Issued</label><span>${formatDate(rx.createdAt)}</span></div>
          <div class="patient-field"><label>Status</label><span style="text-transform:capitalize;color:#6c3de0">${rx.status}</span></div>
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
        <div>
          <div class="signature-line">${rx.doctorName || 'Doctor'}<br/>Signature &amp; Seal</div>
        </div>
        <div style="text-align:right">
          <div class="date-issued">Issued: ${formatDate(rx.createdAt)}</div>
          <div class="disclaimer">This is a computer-generated prescription from Patient Companion Pro.</div>
          <div class="disclaimer">Always consult your physician before taking any medication.</div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Loading prescriptions...</p></div>;
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Prescriptions</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          View your medication history and active prescriptions
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {['all', 'active', 'completed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <p className="empty-state-title">No prescriptions found</p>
            <p className="empty-state-text">Your prescriptions will appear here after a doctor visit.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filtered.map(rx => (
            <div className="prescription-card" key={rx.id}>
              <div className="prescription-header">
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-1)' }}>{rx.diagnosis}</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {rx.doctorName}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatDate(rx.createdAt)}</span>
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
                    <div className="medicine-name"><Pill size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />{med.name}</div>
                    <div className="medicine-details">
                      <span>📋 {med.dosage}</span>
                      <span>🔄 {med.frequency}</span>
                      <span>📅 {med.duration}</span>
                      {med.instructions && <span>💡 {med.instructions}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {rx.advice && (
                <div style={{
                  marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                }}>
                  <strong style={{ color: 'var(--color-info)' }}>Doctor's Advice:</strong> {rx.advice}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
