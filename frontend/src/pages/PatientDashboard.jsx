import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { appointmentAPI, prescriptionAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

function HealthScoreRing({ score }) {
  const radius = 54, stroke = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="health-score-ring">
      <svg width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={65} cy={65} r={radius} fill="none" stroke="var(--grey-100)" strokeWidth={stroke} />
        <circle cx={65} cy={65} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: '1s ease' }} />
      </svg>
      <div className="score-label">
        <div className="score-value" style={{ color }}>{score}</div>
        <div className="score-text">Health Score</div>
      </div>
    </div>
  )
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      appointmentAPI.getByPatient(user.userId),
      prescriptionAPI.getByPatient(user.userId)
    ]).then(([appts, rxs]) => {
      setAppointments(appts.data || [])
      setPrescriptions(rxs.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user.userId])

  const upcoming = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED')
  const healthScore = 78

  const quickActions = [
    { icon: '🤖', label: 'AI Chatbot', desc: 'Chat with health assistant', to: '/chatbot', color: '#1a56db' },
    { icon: '🔍', label: 'Symptom Check', desc: 'Check your symptoms', to: '/chatbot', color: '#06b6d4' },
    { icon: '📋', label: 'Upload Report', desc: 'Analyze health reports', to: '/reports', color: '#10b981' },
    { icon: '🚨', label: 'Emergency', desc: 'Get emergency help', to: '/emergency', color: '#ef4444' },
  ]

  return (
    <Layout title="Patient Dashboard">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1340a8 100%)',
        borderRadius: 'var(--radius)', padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 6 }}>
            Good day, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
            You have <strong>{upcoming.length}</strong> upcoming appointment{upcoming.length !== 1 ? 's' : ''}
          </p>
          <button className="btn btn-sm" style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            onClick={() => navigate('/appointments')}>
            Book Appointment →
          </button>
        </div>
        <HealthScoreRing score={healthScore} />
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div>
            <div className="stat-value">{upcoming.length}</div>
            <div className="stat-label">Upcoming Appts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💊</div>
          <div>
            <div className="stat-value">{prescriptions.length}</div>
            <div className="stat-label">Prescriptions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📋</div>
          <div>
            <div className="stat-value">{appointments.length}</div>
            <div className="stat-label">Total Visits</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">❤️</div>
          <div>
            <div className="stat-value">{healthScore}</div>
            <div className="stat-label">Health Score</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                style={{
                  background: `${a.color}12`, border: `1.5px solid ${a.color}30`,
                  borderRadius: 10, padding: '14px 12px', cursor: 'pointer', textAlign: 'left', transition: '0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = `${a.color}20`}
                onMouseOut={e => e.currentTarget.style.background = `${a.color}12`}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{a.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: a.color }}>{a.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--grey-500)', marginTop: 2 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Appointments</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/appointments')}>View All</button>
          </div>
          <div className="card-body">
            {loading ? <div className="loading">Loading...</div>
              : upcoming.length === 0
              ? <div className="text-center text-muted" style={{ padding: '20px 0' }}>No upcoming appointments</div>
              : upcoming.slice(0, 3).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ width: 42, height: 42, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>👨‍⚕️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Dr. {a.doctor?.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--grey-500)' }}>{a.appointmentDate} at {a.appointmentTime}</p>
                    <span className={`badge badge-${a.status === 'CONFIRMED' ? 'success' : 'warning'}`} style={{ marginTop: 4 }}>{a.status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">Recent Prescriptions</h3>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/prescriptions')}>View All</button>
        </div>
        <div className="card-body table-wrapper">
          {prescriptions.length === 0
            ? <div className="text-center text-muted" style={{ padding: '20px 0' }}>No prescriptions yet</div>
            : (
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Medicines</th></tr>
              </thead>
              <tbody>
                {prescriptions.slice(0, 5).map(rx => (
                  <tr key={rx.id}>
                    <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
                    <td>Dr. {rx.doctor?.name}</td>
                    <td>{rx.diagnosis || '—'}</td>
                    <td>{rx.medicines?.length || 0} medicine(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
