import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { prescriptionAPI } from '../services/api'

export default function RemindersPage() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hc_reminders') || '[]') } catch { return [] }
  })
  const [form, setForm] = useState({ medicineName: '', dosage: '', times: ['08:00'], startDate: '', endDate: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted')
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false)

  useEffect(() => {
    localStorage.setItem('hc_reminders', JSON.stringify(reminders))
  }, [reminders])

  // Sync prescriptions to reminders
  useEffect(() => {
    if (user?.role === 'PATIENT') {
      setIsLoadingPrescriptions(true)
      prescriptionAPI.getByPatient(user.userId).then(res => {
        const prescriptions = res.data || []
        let newRemindersAdded = 0
        
        setReminders(prevReminders => {
          const updatedReminders = [...prevReminders]
          
          prescriptions.forEach(rx => {
            if (!rx.medicines) return
            
            rx.medicines.forEach(med => {
              // Check if we already have a reminder for this medicine name
              const exists = updatedReminders.some(r => r.medicineName.toLowerCase() === med.medicineName.toLowerCase())
              if (!exists) {
                // Determine times based on frequency
                const freq = med.frequency ? med.frequency.toLowerCase() : ''
                let times = ['08:00']
                if (freq.includes('twice') || freq.includes('1-0-1')) times = ['08:00', '20:00']
                if (freq.includes('thrice') || freq.includes('1-1-1')) times = ['08:00', '14:00', '20:00']

                updatedReminders.push({
                  id: Date.now() + Math.random(),
                  medicineName: med.medicineName,
                  dosage: med.dosage || '',
                  times: times,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: '',
                  notes: `Auto-added from Dr. ${rx.doctor?.name || 'Doctor'} prescription`,
                  active: true,
                  createdAt: new Date().toISOString()
                })
                newRemindersAdded++
              }
            })
          })
          
          if (newRemindersAdded > 0) {
            toast.success(`Successfully synced ${newRemindersAdded} new prescribed medicines to reminders!`)
          }
          return updatedReminders
        })
      }).catch(err => {
        console.error('Failed to sync prescriptions:', err)
      }).finally(() => setIsLoadingPrescriptions(false))
    }
  }, [user?.role, user?.userId])

  useEffect(() => {
    if (!notifGranted) return
    const interval = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      reminders.filter(r => r.active).forEach(r => {
        if (r.times.includes(currentTime)) {
          new Notification(`💊 Medicine Reminder`, {
            body: `Time to take ${r.medicineName} - ${r.dosage}`,
            icon: '/favicon.svg'
          })
        }
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [reminders, notifGranted])

  const requestNotifications = async () => {
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === 'granted')
    if (perm === 'granted') toast.success('Notifications enabled!')
    else toast.error('Notifications blocked')
  }

  const addTime = () => setForm(f => ({ ...f, times: [...f.times, '08:00'] }))
  const removeTime = (i) => setForm(f => ({ ...f, times: f.times.filter((_, idx) => idx !== i) }))
  const updateTime = (i, val) => setForm(f => ({ ...f, times: f.times.map((t, idx) => idx === i ? val : t) }))

  const saveReminder = () => {
    if (!form.medicineName || !form.startDate) return toast.error('Medicine name and start date required')
    const reminder = { id: Date.now(), ...form, active: true, createdAt: new Date().toISOString() }
    setReminders(prev => [reminder, ...prev])
    setForm({ medicineName: '', dosage: '', times: ['08:00'], startDate: '', endDate: '', notes: '' })
    setShowForm(false)
    toast.success('Reminder set!')
  }

  const toggleReminder = (id) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id))
    toast.success('Reminder deleted')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout title="Medicine Reminders">
      {/* Notification Banner */}
      {!notifGranted && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ color: '#92400e', fontSize: '0.875rem' }}>🔔 Enable browser notifications to receive medicine reminders</p>
          <button className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', flexShrink: 0 }} onClick={requestNotifications}>
            Enable Notifications
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Medicine Reminders</h2>
          <p className="text-muted text-sm">
            {reminders.filter(r => r.active).length} active reminder(s)
            {isLoadingPrescriptions && ' • Syncing prescriptions...'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Reminder'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">New Medicine Reminder</h3></div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input className="form-control" placeholder="e.g. Metformin 500mg" value={form.medicineName}
                  onChange={e => setForm(f => ({...f, medicineName: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Dosage</label>
                <input className="form-control" placeholder="e.g. 1 tablet" value={form.dosage}
                  onChange={e => setForm(f => ({...f, dosage: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-control" min={today} value={form.startDate}
                  onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control" min={form.startDate || today} value={form.endDate}
                  onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Reminder Times</label>
                <button className="btn btn-sm btn-outline" onClick={addTime}>+ Add Time</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {form.times.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="time" className="form-control" style={{ width: 'auto' }} value={t}
                      onChange={e => updateTime(i, e.target.value)} />
                    {form.times.length > 1 && (
                      <button className="btn btn-sm btn-danger" onClick={() => removeTime(i)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-control" placeholder="e.g. Take after meal" value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <button className="btn btn-primary" onClick={saveReminder}>Save Reminder</button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏰</div>
            <p style={{ fontWeight: 600, color: 'var(--grey-700)' }}>No reminders set</p>
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>Add medicine reminders to never miss a dose</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>Set First Reminder</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reminders.map(r => (
            <div key={r.id} className="card" style={{ borderLeft: `4px solid ${r.active ? 'var(--primary)' : 'var(--grey-300)'}`, opacity: r.active ? 1 : 0.65 }}>
              <div className="card-body" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.3rem' }}>💊</span>
                      <h4 style={{ fontWeight: 700, color: 'var(--grey-800)' }}>{r.medicineName}</h4>
                      {r.dosage && <span className="badge badge-secondary">{r.dosage}</span>}
                      <span className={`badge badge-${r.active ? 'success' : 'secondary'}`}>{r.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                      {r.times.map((t, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>
                          🕐 {t}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--grey-500)', marginTop: 4 }}>
                      {r.startDate} {r.endDate ? `→ ${r.endDate}` : '(ongoing)'} {r.notes ? `• ${r.notes}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className={`btn btn-sm ${r.active ? 'btn-secondary' : 'btn-success'}`} onClick={() => toggleReminder(r.id)}>
                      {r.active ? 'Pause' : 'Resume'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteReminder(r.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
