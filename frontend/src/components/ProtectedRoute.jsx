import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — restricts access based on user role.
 * Usage: <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Redirect to correct dashboard if role doesn't match
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }

  return children;
}
