import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BASE_URL } from '../../services/api'
import NotificationBell from './NotificationBell'

const patientNav = [
  { to: '/patient', icon: '🏠', label: 'Dashboard' },
  { to: '/profile', icon: '👤', label: 'Profile' },
  { to: '/appointments', icon: '📅', label: 'Appointments' },
  { to: '/find-doctors', icon: '🔎', label: 'Find Doctors' },
  { to: '/prescriptions', icon: '💊', label: 'Prescriptions' },
  { to: '/reminders', icon: '⏰', label: 'Reminders' },
  { to: '/scanner', icon: '🔍', label: 'Medicine Scanner' },
  { to: '/reports', icon: '📋', label: 'Reports' },
  { to: '/chatbot', icon: '🤖', label: 'AI Assistant' },
  { to: '/analytics', icon: '📊', label: 'Health Analytics' },
  { to: '/hospitals', icon: '🏥', label: 'Hospital Finder' },
  { to: '/telemedicine', icon: '📹', label: 'Video Call' },
  { to: '/billing', icon: '💳', label: 'Billing' },
  { to: '/emergency', icon: '🚨', label: 'Emergency' },
]

const doctorNav = [
  { to: '/doctor', icon: '🏠', label: 'Dashboard' },
  { to: '/profile', icon: '👤', label: 'Profile' },
  { to: '/appointments', icon: '📅', label: 'Appointments' },
  { to: '/prescriptions', icon: '💊', label: 'Prescriptions' },
  { to: '/telemedicine', icon: '📹', label: 'Video Call' },
  { to: '/billing', icon: '💳', label: 'Billing' },
]

const adminNav = [
  { to: '/admin', icon: '🏠', label: 'Dashboard' },
  { to: '/profile', icon: '👤', label: 'Profile' },
]

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  // Theme logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [window.location.pathname])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const navItems = user?.role === 'DOCTOR' ? doctorNav
    : user?.role === 'ADMIN' ? adminNav
    : patientNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>Health<span>Care</span></h2>
          <p style={{ color: 'var(--grey-500)', fontSize: '0.75rem', marginTop: 4 }}>
            Smart Health Platform
          </p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/patient' || item.to === '/doctor' || item.to === '/admin'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <p style={{ color: 'var(--grey-300)', fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</p>
            <p style={{ color: 'var(--grey-500)', fontSize: '0.75rem' }}>{user?.role}</p>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', display: 'none' }}
            >
              ☰
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-actions flex items-center space-x-4">
            <button 
              className="btn btn-outline btn-sm" 
              onClick={toggleTheme}
              style={{ padding: '6px 10px', borderRadius: '50%', fontSize: '1rem' }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <NotificationBell />
            <div className="flex items-center space-x-2">
              {user?.profilePicture && (
                <img 
                  src={(BASE_URL.replace('/api', '') + user.profilePicture)} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border border-gray-300" 
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm text-muted font-medium">{user?.name}</span>
                <span className="badge badge-primary text-xs w-max">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
