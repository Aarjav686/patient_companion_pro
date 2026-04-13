import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity } from 'lucide-react';
import { CITIES, STATES } from '../../utils/locationUtils';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'patient', phone: '', gender: '', bloodGroup: '',
    specialization: '', qualification: '', hospital: '',
    city: '', state: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...data } = formData;
      const user = await register(data);
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      setError(err?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Activity /></div>
          <h1>Patient Companion</h1>
          <p>Create your account</p>
        </div>

        <div className="auth-card">
          <h2>Sign Up</h2>
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Role Selector */}
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {['patient', 'doctor'].map(role => (
                  <button
                    key={role}
                    type="button"
                    className={`btn ${formData.role === role ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setFormData(prev => ({ ...prev, role }))}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="name" className="form-input" placeholder="Enter full name"
                value={formData.name} onChange={handleChange} required id="register-name" />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" placeholder="Enter email"
                value={formData.email} onChange={handleChange} required id="register-email" />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input name="password" type="password" className="form-input" placeholder="Min 6 characters"
                  value={formData.password} onChange={handleChange} required id="register-password" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input name="confirmPassword" type="password" className="form-input" placeholder="Confirm"
                  value={formData.confirmPassword} onChange={handleChange} required id="register-confirm" />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select name="bloodGroup" className="form-select" value={formData.bloodGroup} onChange={handleChange}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <select name="city" className="form-select" value={formData.city} onChange={handleChange} required>
                  <option value="">Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <select name="state" className="form-select" value={formData.state} onChange={handleChange} required>
                  <option value="">Select State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input name="phone" className="form-input" placeholder="+91 XXXXX XXXXX"
                value={formData.phone} onChange={handleChange} id="register-phone" />
            </div>

            {/* Doctor-specific fields */}
            {formData.role === 'doctor' && (
              <>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <select name="specialization" className="form-select" value={formData.specialization} onChange={handleChange} required>
                    <option value="">Select specialization</option>
                    {['General Medicine','Cardiology','Dermatology','Orthopedics','Neurology','Pediatrics','Gynecology','Ophthalmology','ENT','Psychiatry'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <input name="qualification" className="form-input" placeholder="e.g., MBBS, MD"
                      value={formData.qualification} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hospital</label>
                    <input name="hospital" className="form-input" placeholder="Hospital name"
                      value={formData.hospital} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading} id="register-submit">
              {loading ? <span className="spinner spinner-sm"></span> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
