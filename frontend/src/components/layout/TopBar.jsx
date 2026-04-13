import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Bell, Sun, Moon, LogOut, PanelLeftClose, PanelLeft, Settings
} from 'lucide-react';

export default function TopBar({ collapsed, onToggle, theme, onThemeToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={onToggle} title="Toggle sidebar">
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="topbar-right">
        <button className="theme-toggle" onClick={onThemeToggle} title="Toggle theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="topbar-icon-btn" title="Notifications" onClick={() => navigate('/alerts')}>
          <Bell size={20} />
          <span className="badge"></span>
        </button>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Settings"
          >
            <Settings size={20} />
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '180px',
              zIndex: 'var(--z-dropdown)',
              animation: 'fadeInDown 200ms ease-out',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{user?.name}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'none',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--color-danger-bg)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

