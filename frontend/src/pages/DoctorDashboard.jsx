import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { appointmentAPI, prescriptionAPI, availabilityAPI } from '../services/api'
import { toast } from 'react-toastify'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRxModal, setShowRxModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [rxForm, setRxForm] = useState({ diagnosis: '', notes: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }] })
  const [scheduleForm, setScheduleForm] = useState({ id: null, appointmentDate: '', appointmentTime: '' })

  // Availability state
  const [absences, setAbsences] = useState([])
  const [absenceForm, setAbsenceForm] = useState({ date: '', absenceType: 'FULL_DAY', timeslot: '', reason: '' })
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.userId])

  const loadData = () => {
    Promise.all([
      appointmentAPI.getByDoctor(user.userId),
      prescriptionAPI.getByDoctor(user.userId),
      availabilityAPI.getByDoctor(user.userId)
    ]).then(([a, p, av]) => {
      setAppointments(a.data || [])
      setPrescriptions(p.data || [])
      setAbsences(av.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const updateStatus = async (id, status) => {
    try {
      const res = await appointmentAPI.updateStatus(id, { status })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, ...(res.data || {}) } : a))
      toast.success(`Status updated to ${status}`)

      // If COMPLETED, auto-prompt prescription
      if (status === 'COMPLETED') {
        const appt = appointments.find(a => a.id === id)
        if (appt) {
          setTimeout(() => {
            if (window.confirm(`Appointment completed! Would you like to write a prescription for ${appt.patient?.name}?`)) {
              setSelectedAppt(appt)
              setRxForm({ diagnosis: '', notes: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }] })
              setShowRxModal(true)
            }
          }, 300)
        }
      }
    } catch { toast.error('Failed to update status') }
  }

  const handleScheduleAppointment = async () => {
    if (!scheduleForm.appointmentDate || !scheduleForm.appointmentTime) {
      return toast.error('Please select both date and time')
    }

    try {
      const res = await appointmentAPI.reschedule(scheduleForm.id, {
        appointmentDate: scheduleForm.appointmentDate,
        appointmentTime: scheduleForm.appointmentTime
      })
      setAppointments(prev => prev.map(a => a.id === scheduleForm.id ? res.data : a))
      setShowScheduleModal(false)
      toast.success('Appointment scheduled successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule appointment')
    }
  }

  const addMedicine = () => setRxForm(f => ({ ...f, medicines: [...f.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }] }))
  const removeMedicine = (i) => setRxForm(f => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) }))
  const updateMedicine = (i, key, val) => setRxForm(f => ({ ...f, medicines: f.medicines.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }))

  const submitPrescription = async () => {
    // Validate: at least one medicine with name
    const hasValidMedicine = rxForm.medicines.some(m => m.medicineName.trim() !== '')
    if (!hasValidMedicine) {
      return toast.error('Please add at least one medicine with a name')
    }

    // Filter out empty medicines
    const validMedicines = rxForm.medicines.filter(m => m.medicineName.trim() !== '')

    try {
      const res = await prescriptionAPI.create({
        patientId: selectedAppt.patient.id,
        doctorId: user.userId,
        appointmentId: selectedAppt.id,
        diagnosis: rxForm.diagnosis,
        notes: rxForm.notes,
        medicines: validMedicines
      })
      toast.success('Prescription created!')
      setShowRxModal(false)
      setRxForm({ diagnosis: '', notes: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }] })

      // Refresh prescriptions list immediately
      if (res.data) {
        setPrescriptions(prev => [res.data, ...prev])
      } else {
        const freshRx = await prescriptionAPI.getByDoctor(user.userId)
        setPrescriptions(freshRx.data || [])
      }
    } catch { toast.error('Failed to create prescription') }
  }

  // Availability actions
  const markAbsent = async () => {
    if (!absenceForm.date) return toast.error('Please select a date')
    if (absenceForm.absenceType === 'TIMESLOT' && !absenceForm.timeslot) {
      return toast.error('Please select a timeslot')
    }

    try {
      const res = await availabilityAPI.mark({
        doctorId: user.userId,
        date: absenceForm.date,
        absenceType: absenceForm.absenceType,
        timeslot: absenceForm.timeslot,
        reason: absenceForm.reason
      })
      const cancelled = res.data?.cancelledAppointments || 0
      toast.success(`Marked absent${cancelled > 0 ? ` — ${cancelled} appointment(s) cancelled` : ''}`)
      setAbsenceForm({ date: '', absenceType: 'FULL_DAY', timeslot: '', reason: '' })
      setShowAbsenceForm(false)
      // Refresh data
      const [av, ap] = await Promise.all([
        availabilityAPI.getByDoctor(user.userId),
        appointmentAPI.getByDoctor(user.userId)
      ])
      setAbsences(av.data || [])
      setAppointments(ap.data || [])
    } catch { toast.error('Failed to mark absent') }
  }

  const removeAbsence = async (id) => {
    try {
      await availabilityAPI.remove(id)
      setAbsences(prev => prev.filter(a => a.id !== id))
      toast.success('Absence removed')
    } catch { toast.error('Failed to remove absence') }
  }

  const pending = appointments.filter(a => a.status === 'PENDING')
  const confirmed = appointments.filter(a => a.status === 'CONFIRMED')
  const completed = appointments.filter(a => a.status === 'COMPLETED')
  const today = new Date().toISOString().split('T')[0]

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

  return (
    <Layout title="Doctor Dashboard">
      {/* Welcome */}
      <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', borderRadius: 'var(--radius)', padding: '24px 28px', marginBottom: 24, color: 'white' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>Welcome, Dr. {user?.name?.split(' ').slice(-1)[0]}! 🩺</h2>
        <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>You have <strong>{pending.length}</strong> pending appointments today</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: '⏳', label: 'Pending', value: pending.length, cls: 'orange' },
          { icon: '✅', label: 'Confirmed', value: confirmed.length, cls: 'green' },
          { icon: '🏁', label: 'Completed', value: completed.length, cls: 'blue' },
          { icon: '💊', label: 'Prescriptions', value: prescriptions.length, cls: 'cyan' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Appointments Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Appointments</h3></div>
        <div className="card-body table-wrapper">
          {loading ? <div className="loading">Loading...</div> : appointments.length === 0
            ? <p className="text-center text-muted" style={{ padding: 20 }}>No appointments yet</p>
            : (
            <table className="table">
              <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.patient?.name}</strong></td>
                    <td>{a.appointmentDate}</td>
                    <td>{a.appointmentTime}</td>
                    <td>{a.reason || '—'}</td>
                    <td>
                      <span className={`badge badge-${
                        a.status === 'CONFIRMED' ? 'success' :
                        a.status === 'PENDING' ? 'warning' :
                        a.status === 'CANCELLED' ? 'danger' : 'secondary'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.status === 'PENDING' && (
                          <button className="btn btn-sm btn-success" onClick={() => {
                            setScheduleForm({ id: a.id, appointmentDate: a.appointmentDate, appointmentTime: a.appointmentTime || '' })
                            setShowScheduleModal(true)
                          }}>Assign Time & Confirm</button>
                        )}
                        {a.status === 'CONFIRMED' && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => updateStatus(a.id, 'COMPLETED')}>Complete</button>
                            <button className="btn btn-sm btn-outline" onClick={() => {
                              setScheduleForm({ id: a.id, appointmentDate: a.appointmentDate, appointmentTime: a.appointmentTime || '' })
                              setShowScheduleModal(true)
                            }}>Reschedule</button>
                            <button className="btn btn-sm btn-outline" onClick={() => { setSelectedAppt(a); setShowRxModal(true) }}>+ Rx</button>
                          </>
                        )}
                        {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                          <button className="btn btn-sm btn-danger" onClick={() => updateStatus(a.id, 'CANCELLED')}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Doctor Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Date & Time</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Appointment Date</label>
              <input 
                type="date" 
                className="form-control" 
                min={today}
                value={scheduleForm.appointmentDate}
                onChange={e => setScheduleForm(f => ({...f, appointmentDate: e.target.value}))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <select 
                className="form-control"
                value={scheduleForm.appointmentTime}
                onChange={e => setScheduleForm(f => ({...f, appointmentTime: e.target.value}))}
              >
                <option value="">-- Select Time --</option>
                {timeSlots.map(t => (
                  <option key={t} value={`${t}:00`}>{t}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.8rem', color: 'var(--grey-500)', marginTop: 8 }}>The patient will be notified via email and in-app notification when you schedule this appointment.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleScheduleAppointment}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Prescriptions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">My Prescriptions</h3></div>
        <div className="card-body table-wrapper">
          {prescriptions.length === 0
            ? <p className="text-center text-muted" style={{ padding: 20 }}>No prescriptions written yet</p>
            : (
            <table className="table">
              <thead><tr><th>Date</th><th>Patient</th><th>Diagnosis</th><th>Medicines</th></tr></thead>
              <tbody>
                {prescriptions.slice(0, 8).map(rx => (
                  <tr key={rx.id}>
                    <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
                    <td>{rx.patient?.name}</td>
                    <td>{rx.diagnosis || '—'}</td>
                    <td>{rx.medicines?.length || 0} item(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manage Availability */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title">🗓️ Manage Availability</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAbsenceForm(!showAbsenceForm)}>
            {showAbsenceForm ? 'Cancel' : '+ Mark Absent'}
          </button>
        </div>
        <div className="card-body">
          {/* Absence Form */}
          {showAbsenceForm && (
            <div style={{ background: 'var(--grey-50)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16, border: '1px solid var(--grey-200)' }}>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-control" min={today}
                    value={absenceForm.date} onChange={e => setAbsenceForm(f => ({...f, date: e.target.value}))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Absence Type</label>
                  <select className="form-control" value={absenceForm.absenceType}
                    onChange={e => setAbsenceForm(f => ({...f, absenceType: e.target.value, timeslot: ''}))}>
                    <option value="FULL_DAY">Full Day Off</option>
                    <option value="TIMESLOT">Specific Time Slot</option>
                  </select>
                </div>
              </div>
              {absenceForm.absenceType === 'TIMESLOT' && (
                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <select className="form-control" value={absenceForm.timeslot}
                    onChange={e => setAbsenceForm(f => ({...f, timeslot: e.target.value}))}>
                    <option value="">-- Select Time --</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <input className="form-control" placeholder="e.g. Conference, Personal leave..."
                  value={absenceForm.reason} onChange={e => setAbsenceForm(f => ({...f, reason: e.target.value}))} />
              </div>
              <button className="btn btn-primary" onClick={markAbsent}>Mark Absent</button>
            </div>
          )}

          {/* Absence List */}
          {absences.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: 20 }}>No upcoming absences scheduled</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {absences.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#fef3c7', borderRadius: 'var(--radius-sm)',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.3rem' }}>{a.absenceType === 'FULL_DAY' ? '📅' : '⏰'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400e' }}>
                        {new Date(a.unavailableDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {a.absenceType === 'TIMESLOT' && ` at ${a.unavailableTimeslot}`}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#a16207' }}>
                        {a.absenceType === 'FULL_DAY' ? 'Full Day' : 'Time Slot'}{a.reason ? ` — ${a.reason}` : ''}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => removeAbsence(a.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prescription Modal */}
      {showRxModal && (
        <div className="modal-overlay" onClick={() => setShowRxModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">New Prescription — {selectedAppt?.patient?.name}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowRxModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <input className="form-control" value={rxForm.diagnosis} onChange={e => setRxForm(f => ({...f, diagnosis: e.target.value}))} placeholder="Primary diagnosis" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={rxForm.notes} onChange={e => setRxForm(f => ({...f, notes: e.target.value}))} placeholder="Additional notes..." />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Medicines</label>
                <button className="btn btn-sm btn-outline" onClick={addMedicine}>+ Add</button>
              </div>
              {rxForm.medicines.map((m, i) => (
                <div key={i} style={{ background: 'var(--grey-50)', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid var(--grey-200)' }}>
                  <div className="grid-2" style={{ marginBottom: 8 }}>
                    <input className="form-control" placeholder="Medicine name *" value={m.medicineName} onChange={e => updateMedicine(i, 'medicineName', e.target.value)}
                      style={{ borderColor: m.medicineName.trim() === '' && i === 0 ? 'var(--warning)' : undefined }} />
                    <input className="form-control" placeholder="Dosage (e.g. 500mg)" value={m.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)} />
                  </div>
                  <div className="grid-2" style={{ marginBottom: 8 }}>
                    <input className="form-control" placeholder="Frequency (e.g. 2x daily)" value={m.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)} />
                    <input className="form-control" placeholder="Duration (e.g. 7 days)" value={m.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-control" placeholder="Instructions" value={m.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)} style={{ flex: 1 }} />
                    {rxForm.medicines.length > 1 && <button className="btn btn-sm btn-danger" onClick={() => removeMedicine(i)}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRxModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitPrescription}>Save Prescription</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
