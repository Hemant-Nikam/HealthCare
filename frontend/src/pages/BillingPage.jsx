import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { billingAPI } from '../services/api'
import { toast } from 'react-toastify'

const generateReceiptPDF = async (bill) => {
  const { jsPDF } = await import('jspdf')
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
  doc.text('Payment Receipt', 14, 28)

  // Receipt details
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.text(`Receipt #: ${bill.id}`, 14, 50)
  doc.text(`Date: ${new Date(bill.paidAt || bill.requestedAt).toLocaleDateString()}`, 14, 58)
  doc.text(`Status: ${bill.status}`, 14, 66)

  doc.setFont('helvetica', 'bold')
  doc.text('Patient:', 14, 82)
  doc.setFont('helvetica', 'normal')
  doc.text(bill.patient?.name || 'N/A', 50, 82)

  doc.setFont('helvetica', 'bold')
  doc.text('Doctor:', 14, 90)
  doc.setFont('helvetica', 'normal')
  doc.text(`Dr. ${bill.doctor?.name || 'N/A'}`, 50, 90)

  doc.setFont('helvetica', 'bold')
  doc.text('Consultation:', 14, 98)
  doc.setFont('helvetica', 'normal')
  doc.text(bill.consultationType === 'VIDEO_CALL' ? 'Video Call' : 'In-Person', 50, 98)

  if (bill.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Description:', 14, 106)
    doc.setFont('helvetica', 'normal')
    doc.text(bill.description, 50, 106)
  }

  // Amount box
  doc.setFillColor(240, 247, 255)
  doc.rect(14, 118, 180, 30, 'F')
  doc.setDrawColor(26, 86, 219)
  doc.rect(14, 118, 180, 30, 'S')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 86, 219)
  doc.text('Amount Paid:', 24, 136)
  doc.setFontSize(18)
  doc.text(`Rs. ${parseFloat(bill.amount).toFixed(2)}`, 100, 137)

  // Footer
  doc.setFillColor(26, 86, 219)
  doc.rect(0, 280, 210, 17, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text('This is a computer-generated receipt. HealthCare Platform', 14, 290)

  doc.save(`receipt_${bill.id}.pdf`)
}

export default function BillingPage() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'DOCTOR'
  const [bills, setBills] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)

  useEffect(() => {
    loadBilling()
  }, [user])

  const loadBilling = async () => {
    try {
      if (isDoctor) {
        const [billsRes, statsRes] = await Promise.all([
          billingAPI.getByDoctor(user.userId),
          billingAPI.doctorStats(user.userId)
        ])
        setBills(billsRes.data || [])
        setStats(statsRes.data || {})
      } else {
        const [billsRes, statsRes] = await Promise.all([
          billingAPI.getByPatient(user.userId),
          billingAPI.patientStats(user.userId)
        ])
        setBills(billsRes.data || [])
        setStats(statsRes.data || {})
      }
    } catch { toast.error('Failed to load billing data') }
    finally { setLoading(false) }
  }

  const handlePay = async () => {
    if (!selectedBill) return
    try {
      await billingAPI.pay(selectedBill.id)
      toast.success('Payment successful!')
      setShowPayModal(false)
      setSelectedBill(null)
      loadBilling()
    } catch { toast.error('Payment failed') }
  }

  const filteredBills = filter === 'ALL' ? bills : bills.filter(b => b.status === filter)

  return (
    <Layout title="Billing">
      <div className="section-wrapper section-billing">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {isDoctor ? 'Billing & Earnings' : 'My Bills & Payments'}
          </h2>
          <p className="text-muted text-sm">
            {isDoctor ? 'Track your consultation earnings' : 'View and pay your consultation bills'}
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {isDoctor ? (
            <>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>₹{parseFloat(stats.totalEarned || 0).toFixed(0)}</div>
                  <div className="stat-label">Total Earned</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">⏳</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>₹{parseFloat(stats.pendingAmount || 0).toFixed(0)}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">📊</div>
                <div>
                  <div className="stat-value">{bills.length}</div>
                  <div className="stat-label">Total Bills</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-icon blue">💳</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>₹{parseFloat(stats.totalSpent || 0).toFixed(0)}</div>
                  <div className="stat-label">Total Spent</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">⚠️</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--danger)' }}>₹{parseFloat(stats.pendingAmount || 0).toFixed(0)}</div>
                  <div className="stat-label">Pending Payment</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">✅</div>
                <div>
                  <div className="stat-value">{bills.filter(b => b.status === 'PAID').length}</div>
                  <div className="stat-label">Paid Bills</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filter */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Billing History</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'PENDING', 'PAID'].map(f => (
                <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilter(f)}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body table-wrapper">
            {loading ? <div className="loading">Loading...</div>
              : filteredBills.length === 0 ? (
                <div className="text-center" style={{ padding: '40px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>💳</div>
                  <p className="text-muted">No billing records found</p>
                </div>
              ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{isDoctor ? 'Patient' : 'Doctor'}</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    {!isDoctor && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map(bill => (
                    <tr key={bill.id}>
                      <td><strong>{isDoctor ? bill.patient?.name : `Dr. ${bill.doctor?.name}`}</strong></td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          {bill.consultationType === 'VIDEO_CALL' ? '📹 Video' : '🏥 In-Person'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bill.description || '—'}
                      </td>
                      <td><strong style={{ color: 'var(--primary)' }}>₹{parseFloat(bill.amount).toFixed(2)}</strong></td>
                      <td>
                        <span className={`badge ${bill.status === 'PAID' ? 'badge-success' : bill.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(bill.requestedAt).toLocaleDateString()}
                      </td>
                      {!isDoctor && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {bill.status === 'PENDING' && (
                              <button className="btn btn-sm btn-success"
                                onClick={() => { setSelectedBill(bill); setShowPayModal(true) }}>
                                Pay Now
                              </button>
                            )}
                            {bill.status === 'PAID' && (
                              <button className="btn btn-sm btn-outline" onClick={() => generateReceiptPDF(bill)}>
                                📄 Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pay Confirmation Modal */}
      {showPayModal && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Payment</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💳</div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Pay Dr. {selectedBill.doctor?.name}</p>
              <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{selectedBill.description}</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                ₹{parseFloat(selectedBill.amount).toFixed(2)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handlePay}>✅ Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
