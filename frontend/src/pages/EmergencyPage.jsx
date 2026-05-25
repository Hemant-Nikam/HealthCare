import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { emergencyAPI } from '../services/api'
import { toast } from 'react-toastify'

// Simulated call screen component
function CallScreen({ contact, onEnd }) {
  const [callState, setCallState] = useState('connecting') // connecting, ringing, connected, ended
  const [callDuration, setCallDuration] = useState(0)
  const timerRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    // Simulate call progression
    const connectTimer = setTimeout(() => {
      setCallState('ringing')
    }, 1500)

    const ringTimer = setTimeout(() => {
      setCallState('connected')
    }, 4500)

    return () => {
      clearTimeout(connectTimer)
      clearTimeout(ringTimer)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callState])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleEndCall = () => {
    setCallState('ended')
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => onEnd(), 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Pulse animation behind icon */}
      <div style={{
        position: 'relative', marginBottom: 32
      }}>
        {callState === 'ringing' && (
          <>
            <div style={{
              position: 'absolute', inset: -20, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              animation: 'callPulse 1.5s ease-out infinite'
            }} />
            <div style={{
              position: 'absolute', inset: -40, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              animation: 'callPulse 1.5s ease-out infinite 0.5s'
            }} />
          </>
        )}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: callState === 'connected'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem',
          boxShadow: callState === 'connected'
            ? '0 0 40px rgba(16, 185, 129, 0.4)'
            : '0 0 40px rgba(59, 130, 246, 0.4)'
        }}>
          {contact.icon}
        </div>
      </div>

      {/* Contact info */}
      <h2 style={{
        fontFamily: 'var(--font-display, Inter, sans-serif)',
        fontSize: '1.8rem', fontWeight: 700, marginBottom: 4,
        letterSpacing: '-0.02em'
      }}>
        {contact.name}
      </h2>
      <p style={{ fontSize: '1.2rem', opacity: 0.7, marginBottom: 24, fontWeight: 300 }}>
        {contact.number}
      </p>

      {/* Call status */}
      <div style={{
        fontSize: '0.95rem', marginBottom: 40,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        {callState === 'connecting' && (
          <>
            <div className="pulse-dot" style={{ width: 8, height: 8, background: '#fbbf24', borderRadius: '50%' }} />
            <span style={{ color: '#fbbf24' }}>Connecting...</span>
          </>
        )}
        {callState === 'ringing' && (
          <>
            <div className="pulse-dot" style={{ width: 8, height: 8, background: '#60a5fa', borderRadius: '50%' }} />
            <span style={{ color: '#60a5fa' }}>Ringing...</span>
          </>
        )}
        {callState === 'connected' && (
          <>
            <div style={{ width: 8, height: 8, background: '#34d399', borderRadius: '50%' }} />
            <span style={{ color: '#34d399', fontWeight: 600, fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(callDuration)}
            </span>
          </>
        )}
        {callState === 'ended' && (
          <span style={{ color: '#f87171' }}>Call Ended</span>
        )}
      </div>

      {/* Action buttons */}
      {callState !== 'ended' && (
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {callState === 'connected' && (
            <>
              <button style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', fontSize: '1.4rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: '0.2s'
              }} title="Mute">
                🔇
              </button>
              <button style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', fontSize: '1.4rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: '0.2s'
              }} title="Speaker">
                🔊
              </button>
            </>
          )}

          {/* End call button */}
          <button onClick={handleEndCall}
            style={{
              width: 70, height: 70, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none', color: 'white', fontSize: '1.6rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(239, 68, 68, 0.5)',
              transition: 'transform 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="End Call">
            📞
          </button>

          {callState === 'connected' && (
            <button style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: 'white', fontSize: '1.4rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: '0.2s'
            }} title="Keypad">
              ⌨️
            </button>
          )}
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes callPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Confirmation dialog
function ConfirmCallDialog({ contact, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onCancel}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '90%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        textAlign: 'center', color: 'white',
        animation: 'dialogSlideUp 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 16px',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
        }}>
          {contact.icon}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display, Inter, sans-serif)',
          fontSize: '1.25rem', fontWeight: 700, marginBottom: 6
        }}>
          Call {contact.name}?
        </h3>
        <p style={{
          fontSize: '1.5rem', fontWeight: 600, color: '#60a5fa',
          marginBottom: 6, letterSpacing: '0.05em'
        }}>
          {contact.number}
        </p>
        <p style={{
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)',
          marginBottom: 24, lineHeight: 1.5
        }}>
          This will place an emergency call to {contact.name}. Make sure to provide your location and details of the emergency.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel}
            style={{
              flex: 1, padding: '14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', fontWeight: 600, cursor: 'pointer',
              fontSize: '0.95rem', transition: '0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 1, padding: '14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', color: 'white', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.95rem', transition: '0.2s',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            📞 Call Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function EmergencyPage() {
  const [contacts, setContacts] = useState([])
  const [alertForm, setAlertForm] = useState({ name: '', phone: '', location: '', message: '' })
  const [sending, setSending] = useState(false)
  const [alertSent, setAlertSent] = useState(false)
  const [confirmContact, setConfirmContact] = useState(null) // which contact to confirm
  const [callingContact, setCallingContact] = useState(null) // active call simulation

  useEffect(() => {
    emergencyAPI.getContacts()
      .then(r => setContacts(r.data || []))
      .catch(() => setContacts([
        { name: 'Ambulance', number: '108', icon: '🚑' },
        { name: 'Police', number: '100', icon: '🚔' },
        { name: 'Fire', number: '101', icon: '🚒' },
        { name: 'Women Helpline', number: '1091', icon: '👮' },
        { name: 'Disaster Mgmt', number: '1077', icon: '⚠️' },
        { name: 'Child Helpline', number: '1098', icon: '👶' },
      ]))
  }, [])

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => setAlertForm(f => ({...f, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`})),
      () => toast.error('Location access denied')
    )
  }

  const sendAlert = async () => {
    if (!alertForm.name || !alertForm.phone) return toast.error('Name and phone are required')
    setSending(true)
    try {
      await emergencyAPI.sendAlert(alertForm)
      setAlertSent(true)
    } catch {
      toast.error('Failed to send alert. Please call directly.')
    }
    setSending(false)
  }

  const handleContactClick = (e, contact) => {
    e.preventDefault()
    setConfirmContact(contact)
  }

  const handleConfirmCall = () => {
    const contact = confirmContact
    setConfirmContact(null)
    setCallingContact(contact)
    toast.info(`📞 Calling ${contact.name} (${contact.number})...`, { autoClose: 2000 })
  }

  const handleEndCall = () => {
    if (callingContact) {
      toast.success(`✅ Call to ${callingContact.name} ended`, { autoClose: 3000 })
    }
    setCallingContact(null)
  }

  return (
    <div className="emergency-page">
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🚨</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>
            Emergency Help
          </h1>
          <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>
            Tap any service below to place an emergency call
          </p>
        </div>

        {/* Emergency Contacts */}
        <div className="emergency-grid" style={{ marginBottom: 32 }}>
          {contacts.map((c, i) => (
            <a key={i} href={`tel:${c.number}`} className="emergency-contact-card"
              onClick={(e) => handleContactClick(e, c)}>
              <div className="icon">{c.icon}</div>
              <div className="name">{c.name}</div>
              <div className="number">{c.number}</div>
              <div style={{
                marginTop: 8, fontSize: '0.7rem', opacity: 0.6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
              }}>
                📞 Tap to call
              </div>
            </a>
          ))}
        </div>

        {/* Alert Form */}
        {!alertSent ? (
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1.1rem' }}>📍 Send Emergency Alert</h3>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <input style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'var(--font-sans)' }}
                placeholder="Your name *" value={alertForm.name} onChange={e => setAlertForm(f => ({...f, name: e.target.value}))} />
              <input style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'var(--font-sans)' }}
                placeholder="Your phone *" value={alertForm.phone} onChange={e => setAlertForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'var(--font-sans)' }}
                placeholder="Location (or click GPS)" value={alertForm.location} onChange={e => setAlertForm(f => ({...f, location: e.target.value}))} />
              <button onClick={getLocation} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                📍 GPS
              </button>
            </div>
            <textarea style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: 'var(--font-sans)', resize: 'vertical', minHeight: 70 }}
              placeholder="Describe emergency..." value={alertForm.message} onChange={e => setAlertForm(f => ({...f, message: e.target.value}))} />
            <button onClick={sendAlert} disabled={sending}
              style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 8, background: 'white', color: '#991b1b', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
              {sending ? 'Sending...' : '🚨 SEND EMERGENCY ALERT'}
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Alert Sent!</h3>
            <p style={{ opacity: 0.9, marginTop: 8 }}>Emergency services have been notified. Help is on the way.</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>← Back to Login</Link>
        </div>
      </div>

      {/* Confirm call dialog */}
      {confirmContact && (
        <ConfirmCallDialog
          contact={confirmContact}
          onConfirm={handleConfirmCall}
          onCancel={() => setConfirmContact(null)}
        />
      )}

      {/* Call simulation screen */}
      {callingContact && (
        <CallScreen
          contact={callingContact}
          onEnd={handleEndCall}
        />
      )}
    </div>
  )
}
