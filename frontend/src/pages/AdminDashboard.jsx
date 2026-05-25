import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { adminAPI } from '../services/api'
import { toast } from 'react-toastify'

export default function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminAPI.stats(), adminAPI.allUsers()])
      .then(([s, u]) => { setStats(s.data); setUsers(u.data || []) })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const toggleUser = async (id) => {
    try {
      const res = await adminAPI.toggleUser(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
      toast.success(res.data.message)
    } catch { toast.error('Failed to update user') }
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await adminAPI.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('User deleted')
    } catch { toast.error('Failed to delete user') }
  }

  const filtered = users.filter(u => {
    if (tab === 'all') return true
    return u.role === tab.toUpperCase()
  })

  return (
    <Layout title="Admin Panel">
      <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)', borderRadius: 'var(--radius)', padding: '24px 28px', marginBottom: 24, color: 'white' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>Admin Control Panel 🛡️</h2>
        <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>Manage users, doctors and platform settings</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: '👤', label: 'Total Patients', value: stats.totalPatients || 0, cls: 'blue' },
          { icon: '👨‍⚕️', label: 'Total Doctors', value: stats.totalDoctors || 0, cls: 'green' },
          { icon: '📅', label: 'Total Appointments', value: stats.totalAppointments || 0, cls: 'orange' },
          { icon: '⏳', label: 'Pending Appointments', value: stats.pendingAppointments || 0, cls: 'red' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">User Management</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'patient', 'doctor', 'admin'].map(t => (
              <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body table-wrapper">
          {loading ? <div className="loading">Loading...</div> : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{ color: 'var(--grey-500)' }}>{u.email}</td>
                    <td><span className={`badge badge-${u.role === 'DOCTOR' ? 'primary' : u.role === 'ADMIN' ? 'danger' : 'secondary'}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--grey-500)', fontSize: '0.8rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => toggleUser(u.id)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                      </div>
                    </td>
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
