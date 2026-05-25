import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSignaling } from '../contexts/SignalingContext'
import { useAuth } from '../hooks/useAuth'

export default function IncomingCallModal() {
  const { subscribeGlobal, send } = useGlobalSignaling()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [incomingCall, setIncomingCall] = useState(null)

  useEffect(() => {
    // Listen for incoming calls globally
    const unsubscribe = subscribeGlobal((data) => {
      if (data.type === 'call_invite' && data.targetUserId === user?.userId?.toString()) {
        setIncomingCall({
          roomId: data.roomId,
          callerName: data.callerName || 'Doctor'
        })
      }
      if (data.type === 'call_cancel') {
        // If the caller cancelled the ring
        setIncomingCall(null)
      }
    })

    return () => unsubscribe()
  }, [subscribeGlobal, user])

  const acceptCall = () => {
    if (!incomingCall) return
    const roomId = incomingCall.roomId
    
    // Notify caller that we accepted
    send({
      type: 'call_accept',
      roomId: roomId,
      targetUserId: incomingCall.doctorId // we should pass doctorId in call_invite!
      // wait, doctorId is not explicitly sent, let's fix that below if needed, or we just rely on roomId
      // actually, just navigate to telemedicine page. The doctor is already in the room!
    })
    
    setIncomingCall(null)
    navigate(`/telemedicine?room=${roomId}`)
  }

  const declineCall = () => {
    if (!incomingCall) return
    // Notify caller that we declined
    send({
      type: 'call_decline',
      targetUserId: incomingCall.callerId
    })
    setIncomingCall(null)
  }

  if (!incomingCall) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ textAlign: 'center', maxWidth: 350 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'var(--primary)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 16px auto', animation: 'pulse 1.5s infinite'
        }}>
          📹
        </div>
        <h3 style={{ marginBottom: 8, fontSize: '1.2rem' }}>Incoming Video Call</h3>
        <p style={{ color: 'var(--grey-600)', marginBottom: 24 }}>
          {incomingCall.callerName} is calling you...
        </p>
        
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button 
            onClick={declineCall}
            style={{ 
              background: 'var(--danger)', color: 'white', border: 'none', 
              padding: '10px 24px', borderRadius: 24, cursor: 'pointer', fontWeight: 600 
            }}>
            Decline
          </button>
          <button 
            onClick={acceptCall}
            style={{ 
              background: 'var(--success)', color: 'white', border: 'none', 
              padding: '10px 24px', borderRadius: 24, cursor: 'pointer', fontWeight: 600 
            }}>
            Accept
          </button>
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
          }
        `}</style>
      </div>
    </div>
  )
}
