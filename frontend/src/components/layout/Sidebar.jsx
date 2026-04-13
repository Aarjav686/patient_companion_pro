import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, CalendarCheck, Calendar, Stethoscope, FileText,
  FlaskConical, Heart, Bell, Users, ClipboardList,
  PanelLeftClose, PanelLeft, Activity, Brain, UserCircle, Droplet
} from 'lucide-react';

const patientNav = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Healthcare', items: [
    { path: '/appointments', label: 'Appointments', icon: CalendarCheck },
    { path: '/prescriptions', label: 'Prescriptions', icon: ClipboardList },
    { path: '/lab-tests', label: 'Lab Tests', icon: FlaskConical },
    { path: '/records', label: 'Health Records', icon: FileText },
  ]},
  { section: 'Services', items: [
    { path: '/ai-assessment', label: 'AI Assessment', icon: Brain },
    { path: '/blood-donation', label: 'Blood Donation', icon: Droplet },
    { path: '/alerts', label: 'Alerts', icon: Bell },
  ]},
  { section: 'Account', items: [
    { path: '/profile', label: 'My Profile', icon: UserCircle },
  ]},
];

const doctorNav = [
  { section: 'Overview', items: [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Clinical', items: [
    { path: '/doctor/appointments', label: 'Appointments', icon: CalendarCheck },
    { path: '/doctor/patients', label: 'My Patients', icon: Users },
    { path: '/doctor/prescriptions', label: 'Prescriptions', icon: ClipboardList },
    { path: '/doctor/lab-tests', label: 'Lab Tests', icon: FlaskConical },
    { path: '/doctor/schedule', label: 'My Schedule', icon: Calendar },
  ]},
  { section: 'Blood Services', items: [
    { path: '/doctor/blood-bank', label: 'Blood Bank', icon: Droplet },
  ]},
  { section: 'Account', items: [
    { path: '/profile', label: 'My Profile', icon: UserCircle },
  ]},
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = user?.role === 'doctor' ? doctorNav : patientNav;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity />
        </div>
        <span className="sidebar-title">Patient Companion</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — User Info */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={() => navigate('/profile')}
          title="View Profile"
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-user-avatar">
            {getInitials(user?.name)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>
              {user?.role === 'doctor' ? `👨‍⚕️ ${user?.specialization || 'Doctor'}` : '🏥 Patient'}
            </div>
          </div>
          <UserCircle size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
