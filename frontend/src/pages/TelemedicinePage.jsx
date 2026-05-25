import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../components/common/Layout'
import { useAuth } from '../hooks/useAuth'
import { useWebRTC } from '../hooks/useWebRTC'
import { useSignaling } from '../hooks/useSignaling'
import { useGlobalSignaling } from '../contexts/SignalingContext'
import { billingAPI, appointmentAPI } from '../services/api'
import { toast } from 'react-toastify'


function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TelemedicinePage() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'DOCTOR'
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [roomId, setRoomId] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [inCall, setInCall] = useState(false)
  const [remoteName, setRemoteName] = useState('')

  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [isRinging, setIsRinging] = useState(false)
  const { send: sendGlobal, subscribeGlobal } = useGlobalSignaling()

  // Billing popup state (doctor only)
  const [showBillingPopup, setShowBillingPopup] = useState(false)
  const [billingAmount, setBillingAmount] = useState('500')
  const [billingDesc, setBillingDesc] = useState('Video Consultation')
  const [remoteUserId, setRemoteUserId] = useState(null)

  const signaling = useSignaling()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const webrtc = useWebRTC(signaling, roomId, user?.userId?.toString(), user?.name)
  
  // Use a ref to always have the latest handleSignalingMessage
  const handleSignalingRef = useRef(webrtc.handleSignalingMessage)
  useEffect(() => {
    handleSignalingRef.current = webrtc.handleSignalingMessage
  }, [webrtc.handleSignalingMessage])

  // Fetch doctor's patients
  useEffect(() => {
    if (isDoctor) {
      appointmentAPI.getByDoctor(user.userId).then(res => {
        const appts = res.data || []
        const patientMap = {}
        appts.forEach(a => {
           if (a.patient) patientMap[a.patient.id] = a.patient
        })
        setPatients(Object.values(patientMap))
      }).catch(err => console.error('Failed to load patients', err))
    }
  }, [isDoctor, user.userId])

  // Listen for call decline
  useEffect(() => {
    const unsubscribe = subscribeGlobal((data) => {
      if (data.type === 'call_decline') {
        setIsRinging(false)
        toast.info('Patient declined the call.')
      } else if (data.type === 'call_error') {
        setIsRinging(false)
        toast.error(data.message || 'Call failed')
      }
    })
    return () => unsubscribe()
  }, [subscribeGlobal])

  // Set video elements
  useEffect(() => {
    if (localVideoRef.current && webrtc.localStream) {
      localVideoRef.current.srcObject = webrtc.localStream
    }
  }, [webrtc.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && webrtc.remoteStream) {
      console.log('[Telemedicine] Setting remote video srcObject, tracks:', webrtc.remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`))
      remoteVideoRef.current.srcObject = webrtc.remoteStream
      // Force play in case autoplay is blocked
      remoteVideoRef.current.play().catch(e => console.warn('[Telemedicine] Remote video play blocked:', e))
    }
  }, [webrtc.remoteStream])

  // Handle signaling messages — use a stable callback with ref indirection
  const handleMessage = useCallback((message) => {
    if (message.userId !== user?.userId?.toString()) {
      if (message.userName && message.userName !== '') {
        setRemoteName(prev => prev || message.userName)
      }
      if (message.userId) {
        setRemoteUserId(message.userId)
      }
    }
    // Use the ref to always call the latest version
    handleSignalingRef.current(message)
  }, [user?.userId])

  // When call ends, show billing popup for doctor
  useEffect(() => {
    if (webrtc.connectionState === 'ended' && inCall) {
      setInCall(false)
      if (isDoctor && remoteUserId) {
        setShowBillingPopup(true)
      }
    }
  }, [webrtc.connectionState, inCall, isDoctor, remoteUserId])

  const startConsultation = async () => {
    const newRoomId = `DR-${user.userId}-${Date.now()}`
    setRoomId(newRoomId)
    setInCall(true)

    await signaling.connect(newRoomId, handleMessage)
    // Wait for WebSocket connection to be established, then start
    setTimeout(() => {
      webrtc.startCall()
    }, 1000)
  }

  const joinConsultation = async (roomToJoin = null) => {
    const targetRoomId = roomToJoin || joinRoomId.trim()
    if (!targetRoomId) return toast.error('Please enter a Room ID')
    setRoomId(targetRoomId)
    setInCall(true)

    await signaling.connect(targetRoomId, handleMessage)
    setTimeout(() => {
      webrtc.joinCall()
    }, 1000)
  }

  // Auto-join if room param is present
  useEffect(() => {
    const roomParam = searchParams.get('room')
    if (roomParam && !inCall && webrtc.connectionState === 'waiting') {
      setJoinRoomId(roomParam)
      joinConsultation(roomParam)
      // clear the search param so it doesn't re-trigger on refresh
      navigate('/telemedicine', { replace: true })
    }
  }, [searchParams, inCall, webrtc.connectionState, navigate])

  const handleEndCall = () => {
    webrtc.endCall()
    signaling.disconnect()
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast.success('Room ID copied!')
  }

  const ringPatient = async () => {
    if (!selectedPatientId) {
      return toast.error('Please select a patient to call')
    }
    setIsRinging(true)
    try {
      sendGlobal({
        type: 'call_invite',
        targetUserId: selectedPatientId.toString(),
        roomId: roomId,
        callerName: `Dr. ${user.name}`,
        doctorId: user.userId
      })
      toast.success('Ringing patient...')
    } catch (err) {
      setIsRinging(false)
      toast.error('Failed to ring patient')
    }
  }

  const sendBillingRequest = async () => {
    if (!billingAmount || parseFloat(billingAmount) <= 0) {
      return toast.error('Please enter a valid amount')
    }
    try {
      await billingAPI.request({
        patientId: remoteUserId,
        doctorId: user.userId,
        amount: billingAmount,
        description: billingDesc,
        consultationType: 'VIDEO_CALL'
      })
      toast.success('Payment request sent to patient!')
      setShowBillingPopup(false)
    } catch {
      toast.error('Failed to send billing request')
    }
  }

  const statusColors = {
    waiting: { bg: '#fef3c7', color: '#92400e', text: '⏳ Waiting' },
    connecting: { bg: '#dbeafe', color: '#1e40af', text: '🔄 Connecting' },
    connected: { bg: '#d1fae5', color: '#065f46', text: '🟢 Connected' },
    ended: { bg: '#fee2e2', color: '#991b1b', text: '🔴 Ended' }
  }

  const status = statusColors[webrtc.connectionState] || statusColors.waiting

  // Pre-call UI
  if (!inCall && webrtc.connectionState !== 'ended') {
    return (
      <Layout title="Video Consultation">
        <div className="section-wrapper section-telemedicine">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1a56db 100%)',
              borderRadius: 'var(--radius)', padding: '32px', marginBottom: 24,
              color: 'white', textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📹</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8 }}>
                Video Consultation
              </h2>
              <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
                {isDoctor ? 'Start a consultation and share the Room ID with your patient' : 'Enter the Room ID provided by your doctor to join'}
              </p>
            </div>

            {isDoctor ? (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Start Consultation</h3></div>
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <p className="text-muted" style={{ marginBottom: 20 }}>
                    Click below to generate a room and start your camera. Share the Room ID with your patient.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={startConsultation} style={{ fontSize: '1rem' }}>
                    📹 Start Consultation
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Join Consultation</h3></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Room ID *</label>
                    <input className="form-control" placeholder="Enter Room ID (e.g. DR-1-1234567890)"
                      value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && joinConsultation()} />
                  </div>
                  <button className="btn btn-primary w-full" onClick={joinConsultation}>
                    🔗 Join Consultation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // Call ended summary
  if (webrtc.connectionState === 'ended' && !inCall) {
    return (
      <Layout title="Video Consultation">
        <div className="section-wrapper section-telemedicine">
          <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
            <div className="card">
              <div className="card-body" style={{ padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                <h3 style={{ marginBottom: 8 }}>Consultation Ended</h3>
                {webrtc.callDuration > 0 && (
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                    {formatDuration(webrtc.callDuration)}
                  </p>
                )}
                {remoteName && <p className="text-muted" style={{ marginBottom: 16 }}>with {remoteName}</p>}
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Start New Consultation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Popup */}
        {showBillingPopup && (
          <div className="modal-overlay" onClick={() => setShowBillingPopup(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">💳 Send Payment Request</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setShowBillingPopup(false)}>✕</button>
              </div>
              <p className="text-muted" style={{ marginBottom: 16, fontSize: '0.9rem' }}>
                Send a payment request to the patient for this consultation?
              </p>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" className="form-control" value={billingAmount}
                  onChange={e => setBillingAmount(e.target.value)} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={billingDesc}
                  onChange={e => setBillingDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowBillingPopup(false)}>Skip</button>
                <button className="btn btn-primary" onClick={sendBillingRequest}>Send Request</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    )
  }

  // In-call UI
  return (
    <Layout title="Video Consultation">
      <div style={{
        position: 'relative', background: '#111', borderRadius: 'var(--radius)',
        overflow: 'hidden', height: 'calc(100vh - 180px)', minHeight: 400
      }}>
        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: status.bg, color: status.color,
              padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600
            }}>
              {status.text}
            </span>
            {webrtc.connectionState === 'connected' && (
              <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 500 }}>
                {formatDuration(webrtc.callDuration)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>Room: {roomId}</span>
            <button onClick={copyRoomId}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem'
              }}>
              📋 Copy
            </button>
            {isDoctor && (
               <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                 <select 
                   value={selectedPatientId} 
                   onChange={e => setSelectedPatientId(e.target.value)} 
                   style={{ background: 'transparent', border: 'none', color: 'white', padding: '4px 8px', fontSize: '0.75rem', outline: 'none', width: 140 }}>
                   <option value="" style={{ color: 'black' }}>Select Patient...</option>
                   {patients.map(p => (
                     <option key={p.id} value={p.id} style={{ color: 'black' }}>{p.name}</option>
                   ))}
                 </select>
                 <button 
                   onClick={ringPatient} 
                   disabled={isRinging} 
                   style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                   {isRinging ? '⏳ Ringing' : '📞 Ring'}
                 </button>
               </div>
            )}
          </div>
        </div>

        {/* Remote video (full) */}
        <video ref={remoteVideoRef} autoPlay playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* No remote video placeholder */}
        {!webrtc.remoteStream && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>
              {webrtc.connectionState === 'connecting' ? '🔄' : '📹'}
            </div>
            <p style={{ fontSize: '1.1rem' }}>
              {webrtc.connectionState === 'connecting'
                ? 'Connecting...'
                : 'Waiting for participant to join...'}
            </p>
            {remoteName && <p style={{ marginTop: 8 }}>{remoteName}</p>}
          </div>
        )}

        {/* Local video (PIP) */}
        <div style={{
          position: 'absolute', bottom: 80, right: 20, width: 180, height: 120,
          borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {webrtc.localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem'
            }}>
              📷 No Camera
            </div>
          )}
          {webrtc.isCameraOff && (
            <div style={{
              position: 'absolute', inset: 0, background: '#333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem'
            }}>
              📷 Camera Off
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
          padding: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
        }}>
          <button onClick={webrtc.toggleMute}
            style={{
              width: 50, height: 50, borderRadius: '50%',
              background: webrtc.isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
              border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer',
              transition: '0.2s'
            }}>
            {webrtc.isMuted ? '🔇' : '🎤'}
          </button>

          <button onClick={webrtc.toggleCamera}
            style={{
              width: 50, height: 50, borderRadius: '50%',
              background: webrtc.isCameraOff ? '#ef4444' : 'rgba(255,255,255,0.2)',
              border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer',
              transition: '0.2s'
            }}>
            {webrtc.isCameraOff ? '🚫' : '📷'}
          </button>

          <button onClick={handleEndCall}
            style={{
              width: 60, height: 50, borderRadius: 25,
              background: '#ef4444', border: 'none', color: 'white',
              fontSize: '1.3rem', cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            📞
          </button>
        </div>
      </div>
    </Layout>
  )
}
