import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      setError(err?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Activity />
          </div>
          <h1>Patient Companion</h1>
          <p>AI-Powered Healthcare Management</p>
        </div>

        <div className="auth-card">
          <h2>Welcome Back</h2>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="login-email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    color: 'var(--color-text-muted)',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
              id="login-submit"
            >
              {loading ? <span className="spinner spinner-sm"></span> : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>

          {/* Demo credentials — only shown when VITE_SHOW_DEMO=true */}
          {import.meta.env.VITE_SHOW_DEMO === 'true' && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-info-bg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.8,
            }}>
              <strong style={{ color: 'var(--color-info)' }}>🇮🇳 Demo Accounts (password: password123)</strong><br />
              <strong>Patients:</strong><br />
              &nbsp;• Rahul Sharma — rahul.sharma@email.com<br />
              &nbsp;• Kavitha Reddy — kavitha.reddy@email.com<br />
              &nbsp;• Arjun Patel — arjun.patel@email.com<br />
              <strong>Doctors:</strong><br />
              &nbsp;• Dr. Anjali Mehta (Cardiologist) — dr.anjali@email.com<br />
              &nbsp;• Dr. Rajan Nair (Pulmonologist) — dr.rajan@email.com<br />
              &nbsp;• Dr. Priya Subramaniam (Neurologist) — dr.priya@email.com
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
