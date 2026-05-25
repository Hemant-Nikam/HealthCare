import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { appointmentAPI, adminAPI, availabilityAPI } from '../services/api'
import { toast } from 'react-toastify'
import ReviewModal from '../components/ReviewModal'

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  
  // Patient Booking Form
  const [form, setForm] = useState({ doctorId: '', appointmentDate: '', reason: '' })
  
  // Doctor Scheduling Form
  const [scheduleForm, setScheduleForm] = useState({ id: null, appointmentDate: '', appointmentTime: '' })

  const [unavailableDates, setUnavailableDates] = useState([])
  const [unavailableSlots, setUnavailableSlots] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [reviewAppt, setReviewAppt] = useState(null)
  const [reviewedAppts, setReviewedAppts] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'PATIENT') {
          const [appts, docs] = await Promise.all([
            appointmentAPI.getByPatient(user.userId),
            adminAPI.doctors()
          ])
          setAppointments(appts.data || [])
          setDoctors(docs.data || [])
        } else {
          const appts = await appointmentAPI.getByDoctor(user.userId)
          setAppointments(appts.data || [])
        }
      } catch { toast.error('Failed to load appointments') }
      finally { setLoading(false) }
    }
    fetchData()
  }, [user])

  // Fetch doctor availability when patient selects doctor
  useEffect(() => {
    if (form.doctorId && user.role === 'PATIENT') {
      availabilityAPI.getByDoctor(form.doctorId).then(res => {
        const absences = res.data || []
        const fullDayDates = absences
          .filter(a => a.absenceType === 'FULL_DAY')
          .map(a => a.unavailableDate)
        setUnavailableDates(fullDayDates)
      }).catch(() => {})
    } else {
      setUnavailableDates([])
    }
  }, [form.doctorId, user.role])

  const bookAppointment = async () => {
    if (!form.doctorId || !form.appointmentDate) {
      return toast.error('Please fill all required fields')
    }

    try {
      const res = await appointmentAPI.book({ ...form, appointmentTime: null, patientId: user.userId })
      setAppointments(prev => [res.data, ...prev])
      setShowModal(false)
      setForm({ doctorId: '', appointmentDate: '', reason: '' })
      toast.success('Appointment requested! Doctor will assign a time slot.')
    } catch { toast.error('Failed to book appointment') }
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

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await appointmentAPI.cancel(id)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a))
      toast.success('Appointment cancelled')
    } catch { toast.error('Failed to cancel') }
  }

  const statusColor = s => ({ PENDING: 'warning', CONFIRMED: 'success', CANCELLED: 'danger', COMPLETED: 'secondary' }[s] || 'secondary')

  const today = new Date().toISOString().split('T')[0]
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

  return (
    <Layout title="Appointments">
      <div className="section-wrapper section-appointments">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Appointments</h2>
            <p className="text-muted text-sm">Manage your scheduled appointments</p>
          </div>
          {user.role === 'PATIENT' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>📅 Request Appointment</button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
            <div className="stat-card" key={s}>
              <div className={`stat-icon ${s === 'CONFIRMED' ? 'green' : s === 'PENDING' ? 'orange' : s === 'CANCELLED' ? 'red' : 'blue'}`}>
                {s === 'PENDING' ? '⏳' : s === 'CONFIRMED' ? '✅' : s === 'COMPLETED' ? '🏁' : '❌'}
              </div>
              <div>
                <div className="stat-value">{appointments.filter(a => a.status === s).length}</div>
                <div className="stat-label">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-body table-wrapper">
            {loading ? <div className="loading">Loading...</div>
              : appointments.length === 0
              ? (
                <div className="text-center" style={{ padding: '40px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
                  <p className="font-semibold">No appointments yet</p>
                  {user.role === 'PATIENT' && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Book your first appointment</button>}
                </div>
              ) : (
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-sm">
                    <th className="py-3 px-4 font-medium">{user.role === 'PATIENT' ? 'Doctor' : 'Patient'}</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Time</th>
                    <th className="py-3 px-4 font-medium">Reason</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4"><strong>{user.role === 'PATIENT' ? `Dr. ${a.doctor?.name}` : a.patient?.name}</strong></td>
                      <td className="py-3 px-4">{a.appointmentDate}</td>
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {a.appointmentTime ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{a.appointmentTime}</span>
                        ) : (
                          <span className="text-orange-500 text-xs italic">To be assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '—'}</td>
                      <td className="py-3 px-4"><span className={`badge badge-${statusColor(a.status)}`}>{a.status}</span></td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {(a.status === 'PENDING' || a.status === 'CONFIRMED') && user.role === 'DOCTOR' && (
                             <button className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium hover:bg-indigo-100" onClick={() => {
                               setScheduleForm({ id: a.id, appointmentDate: a.appointmentDate, appointmentTime: a.appointmentTime || '' })
                               setShowScheduleModal(true)
                             }}>
                               {a.appointmentTime ? 'Reschedule' : 'Set Time'}
                             </button>
                          )}
                          {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                            <button className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100" onClick={() => cancelAppointment(a.id)}>Cancel</button>
                          )}
                          {user.role === 'PATIENT' && a.status === 'COMPLETED' && !reviewedAppts[a.id] && (
                            <button className="btn btn-sm btn-outline" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                              onClick={() => setReviewAppt(a)}>⭐ Rate</button>
                          )}
                          {user.role === 'PATIENT' && a.status === 'COMPLETED' && reviewedAppts[a.id] && (
                            <span className="badge badge-success">✓ Reviewed</span>
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
      </div>

      {/* Patient Book Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Request Appointment</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Select Doctor *</label>
              <select className="form-control" value={form.doctorId} onChange={e => setForm(f => ({...f, doctorId: e.target.value, appointmentDate: ''}))}>
                <option value="">-- Choose Doctor --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Date *</label>
              <input type="date" className="form-control" min={today} value={form.appointmentDate}
                onChange={e => {
                  const val = e.target.value
                  if (unavailableDates.includes(val)) {
                    toast.error('Doctor is unavailable on this date')
                    return
                  }
                  setForm(f => ({...f, appointmentDate: val}))
                }}
              />
              <p className="text-xs text-gray-500 mt-1">The doctor will assign a specific time slot for you on this day.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Reason / Symptoms</label>
              <textarea className="form-control" placeholder="Briefly describe your symptoms or reason for visit..."
                value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={bookAppointment}>Request Appointment</button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Assign Date & Time</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-md p-2" 
                  min={today}
                  value={scheduleForm.appointmentDate}
                  onChange={e => setScheduleForm(f => ({...f, appointmentDate: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={scheduleForm.appointmentTime}
                  onChange={e => setScheduleForm(f => ({...f, appointmentTime: e.target.value}))}
                >
                  <option value="">-- Select Time --</option>
                  {timeSlots.map(t => (
                    <option key={t} value={`${t}:00`}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">The patient will be notified via email and in-app notification when you schedule this appointment.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={handleScheduleAppointment}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewAppt && (
        <ReviewModal
          doctorId={reviewAppt.doctor?.id}
          doctorName={reviewAppt.doctor?.name}
          appointmentId={reviewAppt.id}
          patientId={user.userId}
          onClose={() => setReviewAppt(null)}
          onSubmitted={() => {
            setReviewedAppts(prev => ({...prev, [reviewAppt.id]: true}))
            setReviewAppt(null)
          }}
        />
      )}
    </Layout>
  )
}
