import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { prescriptionAPI } from '../services/api'
import { toast } from 'react-toastify'

const generatePDF = async (rx) => {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()

  // Header
  doc.setFillColor(26, 86, 219)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('HealthCare Platform', 14, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('E-Prescription', 14, 28)

  // Patient & Doctor info
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.text(`Patient: ${rx.patient?.name || 'N/A'}`, 14, 50)
  doc.text(`Doctor: Dr. ${rx.doctor?.name || 'N/A'}`, 14, 58)
  doc.text(`Date: ${new Date(rx.createdAt).toLocaleDateString()}`, 14, 66)
  doc.text(`Prescription ID: #${rx.id}`, 120, 50)

  if (rx.diagnosis) {
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis:', 14, 78)
    doc.setFont('helvetica', 'normal')
    doc.text(rx.diagnosis, 50, 78)
  }

  // Medicines table
  if (rx.medicines?.length) {
    autoTable(doc, {
      startY: 88,
      head: [['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions']],
      body: rx.medicines.map(m => [m.medicineName || '', m.dosage || '', m.frequency || '', m.duration || '', m.instructions || '']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [26, 86, 219] }
    })
  }

  if (rx.notes) {
    const finalY = doc.lastAutoTable?.finalY || 120
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', 14, finalY + 12)
    doc.setFont('helvetica', 'normal')
    doc.text(rx.notes, 14, finalY + 20)
  }

  // Footer
  doc.setFillColor(26, 86, 219)
  doc.rect(0, 280, 210, 17, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(8)
  doc.text('This is a computer-generated prescription. HealthCare Platform © 2024', 14, 290)

  doc.save(`prescription_${rx.id}.pdf`)
}

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRx = user.role === 'PATIENT'
      ? prescriptionAPI.getByPatient(user.userId)
      : prescriptionAPI.getByDoctor(user.userId)

    fetchRx.then(r => {
      const data = r.data || []
      setPrescriptions(data)
      // Auto-select first prescription for patient view
      if (data.length > 0) {
        setSelected(data[0])
      }
    })
      .catch(() => toast.error('Failed to load prescriptions'))
      .finally(() => setLoading(false))
  }, [user])

  return (    <Layout title="Prescriptions">
      <div className="section-wrapper section-prescriptions">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Prescriptions</h2>
            <p className="text-muted text-sm">View and download your prescriptions</p>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 20 }}>
          {/* List */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">All Prescriptions</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? <div className="loading">Loading...</div>
                : prescriptions.length === 0
                ? <div className="text-center text-muted" style={{ padding: 32 }}>No prescriptions found</div>
                : prescriptions.map(rx => (
                <div key={rx.id}
                  onClick={() => setSelected(rx)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: selected?.id === rx.id ? 'var(--primary-light)' : 'transparent',
                    transition: '0.15s'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {user.role === 'PATIENT' ? `Dr. ${rx.doctor?.name}` : rx.patient?.name}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {rx.diagnosis || 'No diagnosis specified'}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {rx.medicines?.length || 0} medicine(s)
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Prescription Details</h3>
              {selected && (
                <button className="btn btn-sm btn-primary" onClick={() => generatePDF(selected)}>📄 Download PDF</button>
              )}
            </div>
            <div className="card-body">
              {!selected
                ? <div className="text-center text-muted" style={{ padding: '40px 0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💊</div>
                    <p>Select a prescription to view details</p>
                  </div>
                : (
                <div>
                  <div style={{ background: 'var(--bg-app)', borderRadius: 8, padding: 14, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                    <div className="grid-2">
                      <div>
                        <p className="text-xs text-muted">Patient</p>
                        <p className="font-semibold">{selected.patient?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Doctor</p>
                        <p className="font-semibold">Dr. {selected.doctor?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Date</p>
                        <p className="font-semibold">{new Date(selected.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Diagnosis</p>
                        <p className="font-semibold">{selected.diagnosis || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Medicines</h4>
                  {(!selected.medicines || selected.medicines.length === 0) ? (
                    <p className="text-muted text-sm" style={{ padding: '12px 0' }}>No medicines prescribed</p>
                  ) : (
                    selected.medicines.map((m, i) => (
                      <div key={i} style={{ background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 8 }}>
                        <p style={{ fontWeight: 600, color: 'var(--primary)' }}>{m.medicineName}</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                          {m.dosage && <span className="badge badge-secondary">💊 {m.dosage}</span>}
                          {m.frequency && <span className="badge badge-secondary">🔄 {m.frequency}</span>}
                          {m.duration && <span className="badge badge-secondary">📅 {m.duration}</span>}
                        </div>
                        {m.instructions && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>📝 {m.instructions}</p>}
                      </div>
                    ))
                  )}

                  {selected.notes && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--warning)', color: 'black', borderRadius: 8, border: '1px solid var(--warning)', opacity: 0.8 }}>
                      <p className="text-xs font-semibold">Doctor's Notes</p>
                      <p style={{ fontSize: '0.85rem', marginTop: 4 }}>{selected.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
