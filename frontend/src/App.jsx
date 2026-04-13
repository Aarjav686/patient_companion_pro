import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient pages
import Dashboard from './pages/patient/Dashboard';
import Appointments from './pages/patient/Appointments';
import Prescriptions from './pages/patient/Prescriptions';
import LabTests from './pages/patient/LabTests';
import Records from './pages/patient/Records';
import Alerts from './pages/patient/Alerts';
import AIAssessment from './pages/patient/AIAssessment';
import Profile from './pages/patient/Profile';
import BloodDonation from './pages/patient/BloodDonation';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientList from './pages/doctor/PatientList';
import ManageAppointments from './pages/doctor/ManageAppointments';
import WritePrescription from './pages/doctor/WritePrescription';
import Schedule from './pages/doctor/Schedule';
import BloodBank from './pages/doctor/BloodBank';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes — wrapped in Layout */}
            <Route element={<Layout />}>
              {/* Patient Routes — only patients can access */}
              <Route path="/dashboard" element={<ProtectedRoute role="patient"><Dashboard /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute role="patient"><Appointments /></ProtectedRoute>} />
              <Route path="/prescriptions" element={<ProtectedRoute role="patient"><Prescriptions /></ProtectedRoute>} />
              <Route path="/lab-tests" element={<ProtectedRoute role="patient"><LabTests /></ProtectedRoute>} />
              <Route path="/records" element={<ProtectedRoute role="patient"><Records /></ProtectedRoute>} />
              <Route path="/blood-donation" element={<ProtectedRoute role="patient"><BloodDonation /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute role="patient"><Alerts /></ProtectedRoute>} />
              <Route path="/ai-assessment" element={<ProtectedRoute role="patient"><AIAssessment /></ProtectedRoute>} />

              {/* Shared routes — both roles */}
              <Route path="/profile" element={<Profile />} />

              {/* Doctor Routes — only doctors can access */}
              <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
              <Route path="/doctor/patients" element={<ProtectedRoute role="doctor"><PatientList /></ProtectedRoute>} />
              <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><ManageAppointments /></ProtectedRoute>} />
              <Route path="/doctor/prescriptions" element={<ProtectedRoute role="doctor"><WritePrescription /></ProtectedRoute>} />
              <Route path="/doctor/lab-tests" element={<ProtectedRoute role="doctor"><LabTests /></ProtectedRoute>} />
              <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor"><Schedule /></ProtectedRoute>} />
              <Route path="/doctor/blood-bank" element={<ProtectedRoute role="doctor"><BloodBank /></ProtectedRoute>} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
