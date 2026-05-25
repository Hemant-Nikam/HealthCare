import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { SignalingProvider } from './contexts/SignalingContext'
import IncomingCallModal from './components/IncomingCallModal'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AppointmentsPage from './pages/AppointmentsPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import ChatbotPage from './pages/ChatbotPage'
import HealthAnalyticsPage from './pages/HealthAnalyticsPage'
import EmergencyPage from './pages/EmergencyPage'
import HospitalFinderPage from './pages/HospitalFinderPage'
import FindDoctorsPage from './pages/FindDoctorsPage'
import RemindersPage from './pages/RemindersPage'
import MedicineScannerPage from './pages/MedicineScannerPage'
import ReportAnalyzerPage from './pages/ReportAnalyzerPage'
import TelemedicinePage from './pages/TelemedicinePage'
import BillingPage from './pages/BillingPage'
import ProfilePage from './pages/ProfilePage'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

const DashboardRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />
  return <Navigate to="/patient" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <SignalingProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />

            {/* Dashboard redirect */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Patient */}
            <Route path="/patient" element={<ProtectedRoute roles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute roles={['PATIENT','DOCTOR']}><AppointmentsPage /></ProtectedRoute>} />
            <Route path="/prescriptions" element={<ProtectedRoute roles={['PATIENT','DOCTOR']}><PrescriptionsPage /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><HealthAnalyticsPage /></ProtectedRoute>} />
            <Route path="/hospitals" element={<ProtectedRoute><HospitalFinderPage /></ProtectedRoute>} />
            <Route path="/find-doctors" element={<ProtectedRoute roles={['PATIENT']}><FindDoctorsPage /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute roles={['PATIENT']}><RemindersPage /></ProtectedRoute>} />
            <Route path="/scanner" element={<ProtectedRoute roles={['PATIENT']}><MedicineScannerPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['PATIENT']}><ReportAnalyzerPage /></ProtectedRoute>} />

            {/* Shared - Video Call & Billing & Profile */}
            <Route path="/telemedicine" element={<ProtectedRoute roles={['PATIENT','DOCTOR']}><TelemedicinePage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute roles={['PATIENT','DOCTOR']}><BillingPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute roles={['PATIENT','DOCTOR', 'ADMIN']}><ProfilePage /></ProtectedRoute>} />

            {/* Doctor */}
            <Route path="/doctor" element={<ProtectedRoute roles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          </Routes>
          <IncomingCallModal />
          <ToastContainer position="top-right" autoClose={3000} />
        </BrowserRouter>
      </SignalingProvider>
    </AuthProvider>
  )
}
