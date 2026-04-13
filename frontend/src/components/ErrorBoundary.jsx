import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-primary, #0f1117)',
          color: 'var(--color-text-primary, #e1e4e8)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            textAlign: 'center',
            padding: '48px 32px',
            maxWidth: '420px',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'hsla(0, 72%, 55%, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AlertTriangle size={32} style={{ color: 'hsl(0, 72%, 55%)' }} />
            </div>
            <h2 style={{ marginBottom: '8px', fontSize: '1.4rem' }}>Something went wrong</h2>
            <p style={{
              color: 'var(--color-text-secondary, #8b949e)',
              fontSize: '0.9rem',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}>
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 28px',
                background: 'hsl(258, 70%, 50%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{
                marginTop: '24px',
                textAlign: 'left',
                fontSize: '0.75rem',
                background: 'hsla(0,0%,100%,0.05)',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                maxHeight: '150px',
                color: 'hsl(0, 72%, 65%)',
              }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
