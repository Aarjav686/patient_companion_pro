import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
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
              {/* Patient Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/prescriptions" element={<Prescriptions />} />
              <Route path="/lab-tests" element={<LabTests />} />
              <Route path="/records" element={<Records />} />
              <Route path="/blood-donation" element={<BloodDonation />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/ai-assessment" element={<AIAssessment />} />
              <Route path="/profile" element={<Profile />} />

              {/* Doctor Routes */}
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<PatientList />} />
              <Route path="/doctor/appointments" element={<ManageAppointments />} />
              <Route path="/doctor/prescriptions" element={<WritePrescription />} />
              <Route path="/doctor/lab-tests" element={<LabTests />} />
              <Route path="/doctor/schedule" element={<Schedule />} />
              <Route path="/doctor/blood-bank" element={<BloodBank />} />
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

