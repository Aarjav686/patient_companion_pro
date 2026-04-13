import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User, Mail, Phone, Droplets, Heart, Stethoscope,
  Building2, GraduationCap, BadgeIndianRupee, Edit3,
  Save, X, ShieldCheck, Calendar, AlertTriangle, CheckCircle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other'];
const COMMON_CONDITIONS = [
  'Diabetes Type 2', 'Hypertension', 'Asthma', 'Heart Disease',
  'Hypothyroidism', 'Arthritis', 'COPD', 'Chronic Kidney Disease',
  'Depression', 'Anxiety'
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state — pre-fill from user object
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || 'male',
    blood_group: user?.blood_group || '',
    allergies: (user?.allergies || []).join(', '),
    chronic_conditions: user?.chronic_conditions || [],
    // Doctor fields
    specialization: user?.specialization || '',
    qualification: user?.qualification || '',
    hospital: user?.hospital || '',
    consultation_fee: user?.consultation_fee || '',
  });

  const isDoctor = user?.role === 'doctor';

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleCondition = (cond) => {
    setForm(prev => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.includes(cond)
        ? prev.chronic_conditions.filter(c => c !== cond)
        : [...prev.chronic_conditions, cond]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatePayload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        age: parseInt(form.age) || null,
        gender: form.gender,
        blood_group: form.blood_group,
        allergies: form.allergies.split(',').map(a => a.trim()).filter(Boolean),
        chronic_conditions: form.chronic_conditions,
        specialization: form.specialization,
        qualification: form.qualification,
        hospital: form.hospital,
        consultation_fee: parseInt(form.consultation_fee) || null,
      };
      await updateUser(updatePayload);
      setEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err?.error || 'Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current user data
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      age: user?.age || '',
      gender: user?.gender || 'male',
      blood_group: user?.blood_group || '',
      allergies: (user?.allergies || []).join(', '),
      chronic_conditions: user?.chronic_conditions || [],
      specialization: user?.specialization || '',
      qualification: user?.qualification || '',
      hospital: user?.hospital || '',
      consultation_fee: user?.consultation_fee || '',
    });
    setEditing(false);
  };

  // Profile color based on role
  const avatarGradient = isDoctor
    ? 'linear-gradient(135deg, hsl(165, 60%, 40%), hsl(195, 72%, 45%))'
    : 'linear-gradient(135deg, hsl(258, 70%, 50%), hsl(280, 72%, 55%))';

  return (
    <div className="stagger-children">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 999,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 20px',
          background: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          animation: 'fadeInDown 300ms ease-out',
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <User color="var(--color-primary)" size={28} />
          My Profile
        </h1>
        <p>View and manage your personal information and health details.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* ── Left: Profile Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Avatar + identity */}
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: avatarGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              fontSize: '2rem', fontWeight: 700, color: '#fff',
              boxShadow: '0 8px 24px hsla(258, 70%, 50%, 0.35)',
            }}>
              {getInitials(user?.name)}
            </div>
            <h2 style={{ marginBottom: '4px' }}>{user?.name}</h2>
            <div style={{
              display: 'inline-block',
              padding: '3px 14px',
              background: isDoctor ? 'var(--color-success-bg)' : 'var(--color-primary-bg)',
              color: isDoctor ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              textTransform: 'capitalize',
              marginBottom: 'var(--space-3)',
            }}>
              {isDoctor ? `👨‍⚕️ ${user?.specialization || 'Doctor'}` : '🏥 Patient'}
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {user?.email}
            </p>
          </div>

          {/* Quick info chips */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 'var(--font-size-sm)' }}>
                <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Quick Info
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { icon: Mail, label: 'Email', val: user?.email },
                { icon: Phone, label: 'Phone', val: user?.phone || '—' },
                !isDoctor && { icon: Droplets, label: 'Blood Group', val: user?.blood_group || '—' },
                !isDoctor && { icon: Calendar, label: 'Age', val: user?.age ? `${user.age} years` : '—' },
                isDoctor && { icon: Building2, label: 'Hospital', val: user?.hospital || '—' },
                isDoctor && { icon: BadgeIndianRupee, label: 'Consult Fee', val: user?.consultation_fee ? `₹${user.consultation_fee}` : '—' },
              ].filter(Boolean).map(({ icon: Icon, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Icon size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Details + Edit ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Personal Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <User size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Personal Information
              </h3>
              {!editing ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={saving}>
                    <X size={14} /> Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                    {saving ? <span className="spinner spinner-sm" /> : <Save size={14} />}
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  {editing ? (
                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  ) : (
                    <div style={valueStyle}>{user?.name || '—'}</div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  {editing ? (
                    <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  ) : (
                    <div style={valueStyle}>{user?.phone || '—'}</div>
                  )}
                </div>
                {!isDoctor && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Age</label>
                      {editing ? (
                        <input className="form-input" type="number" min="1" max="120" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>{user?.age ? `${user.age} years` : '—'}</div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Gender</label>
                      {editing ? (
                        <select className="form-select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                          {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                        </select>
                      ) : (
                        <div style={valueStyle} className="text-capitalize">{user?.gender || '—'}</div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Blood Group</label>
                      {editing ? (
                        <select className="form-select" value={form.blood_group} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                          <option value="">Select</option>
                          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      ) : (
                        <div style={{ ...valueStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Droplets size={14} style={{ color: 'hsl(0, 72%, 55%)' }} />
                          {user?.blood_group || '—'}
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Known Allergies</label>
                      {editing ? (
                        <input className="form-input" placeholder="e.g. Penicillin, Sulfa" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>{user?.allergies?.join(', ') || 'None'}</div>
                      )}
                    </div>
                  </>
                )}
                {isDoctor && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Specialization</label>
                      {editing ? (
                        <input className="form-input" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>{user?.specialization || '—'}</div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Qualification</label>
                      {editing ? (
                        <input className="form-input" value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>{user?.qualification || '—'}</div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Hospital / Clinic</label>
                      {editing ? (
                        <input className="form-input" value={form.hospital} onChange={e => setForm(p => ({ ...p, hospital: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>{user?.hospital || '—'}</div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Consultation Fee (₹)</label>
                      {editing ? (
                        <input className="form-input" type="number" value={form.consultation_fee} onChange={e => setForm(p => ({ ...p, consultation_fee: e.target.value }))} />
                      ) : (
                        <div style={valueStyle}>₹{user?.consultation_fee || '—'}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chronic Conditions — patients only */}
          {!isDoctor && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Heart size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Chronic Conditions
                </h3>
                {editing && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Click to toggle
                  </span>
                )}
              </div>
              <div className="card-body">
                {!editing ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(user?.chronic_conditions || []).length === 0
                      ? <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No chronic conditions recorded.</span>
                      : (user.chronic_conditions).map((c, i) => (
                          <span key={i} style={{
                            padding: '4px 14px', borderRadius: 'var(--radius-full)',
                            background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
                            fontSize: 'var(--font-size-sm)', fontWeight: 500,
                            border: '1px solid var(--color-warning)',
                          }}>{c}</span>
                        ))
                    }
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COMMON_CONDITIONS.map(cond => {
                      const selected = form.chronic_conditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => handleToggleCondition(cond)}
                          style={{
                            padding: '5px 14px', borderRadius: 'var(--radius-full)',
                            background: selected ? 'var(--color-warning-bg)' : 'var(--color-bg-tertiary)',
                            color: selected ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                            border: `1px solid ${selected ? 'var(--color-warning)' : 'var(--color-border)'}`,
                            fontSize: 'var(--font-size-sm)', fontWeight: selected ? 600 : 400,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {selected ? '✓ ' : ''}{cond}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Doctor bio strip */}
          {isDoctor && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--color-success-bg), var(--color-info-bg))',
              border: '1px solid var(--color-success)',
            }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <Stethoscope size={36} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                    {user?.name}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    {user?.qualification} &nbsp;·&nbsp; {user?.specialization}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                    <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {user?.hospital || 'Hospital not set'}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                    ₹{user?.consultation_fee || '—'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>per consultation</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const valueStyle = {
  padding: 'var(--space-2) 0',
  fontSize: 'var(--font-size-base)',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  minHeight: '36px',
  display: 'flex',
  alignItems: 'center',
};
