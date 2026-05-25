import { useRef, useState, useCallback, useEffect } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export function useWebRTC(signaling, roomId, userId, userName) {
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const isInitiatorRef = useRef(false)
  const signalingRef = useRef(signaling)
  const roomIdRef = useRef(roomId)
  const userIdRef = useRef(userId)
  const userNameRef = useRef(userName)

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('waiting')
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callStartTime, setCallStartTime] = useState(null)
  const [callDuration, setCallDuration] = useState(0)
  const durationInterval = useRef(null)

  // Keep refs up to date
  useEffect(() => { signalingRef.current = signaling }, [signaling])
  useEffect(() => { roomIdRef.current = roomId }, [roomId])
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { userNameRef.current = userName }, [userName])

  // Initialize local media
  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      })
      console.log('[WebRTC] Got local media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.id}`))
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('[WebRTC] Failed to get video+audio media:', err)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('[WebRTC] Got audio-only stream')
        localStreamRef.current = stream
        setLocalStream(stream)
        return stream
      } catch (e) {
        console.error('[WebRTC] No media devices available:', e)
        return null
      }
    }
  }, [])

  // Send a signaling message via refs (never stale)
  const sendSignal = useCallback((msg) => {
    if (signalingRef.current?.send) {
      signalingRef.current.send({
        ...msg,
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        userName: userNameRef.current
      })
    }
  }, [])

  // Flush pending ICE candidates after remote description is set
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    const candidates = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('[WebRTC] Added buffered ICE candidate')
      } catch (err) {
        console.error('[WebRTC] Error adding buffered ICE candidate:', err)
      }
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback((stream) => {
    if (pcRef.current) {
      console.log('[WebRTC] Closing existing peer connection before creating new one')
      pcRef.current.close()
    }

    console.log('[WebRTC] Creating new RTCPeerConnection')
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks to the connection
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`[WebRTC] Adding local track: ${track.kind} (enabled: ${track.enabled})`)
        pc.addTrack(track, stream)
      })
    }

    // Handle remote tracks — this is how the other side receives media
    pc.ontrack = (event) => {
      console.log('[WebRTC] 🎉 Received remote track:', event.track.kind, 'streams:', event.streams.length)
      if (event.streams && event.streams[0]) {
        // Create a new MediaStream instance to force React to re-render the video tag
        setRemoteStream(new MediaStream(event.streams[0].getTracks()))
      } else {
        // Fallback
        setRemoteStream(prev => {
          const rs = prev ? new MediaStream(prev.getTracks()) : new MediaStream()
          rs.addTrack(event.track)
          return rs
        })
      }
      setConnectionState('connected')
      setCallStartTime(prev => prev || Date.now())
    }

    // Handle ICE candidates — send to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate')
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('connected')
        setCallStartTime(prev => prev || Date.now())
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE connection lost:', pc.iceConnectionState)
        setConnectionState('ended')
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setConnectionState('connected')
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setConnectionState('ended')
      }
    }

    pc.onnegotiationneeded = () => {
      console.log('[WebRTC] Negotiation needed (initiator:', isInitiatorRef.current, ')')
    }

    pcRef.current = pc
    return pc
  }, [sendSignal])

  // ===== Doctor: Start a call (create offer) =====
  const startCall = useCallback(async () => {
    console.log('[WebRTC] === STARTING CALL (Doctor/Initiator) ===')
    isInitiatorRef.current = true
    setConnectionState('connecting')
    pendingCandidatesRef.current = []

    const stream = await initLocalStream()
    if (!stream) {
      console.error('[WebRTC] Cannot start call without local stream')
      return
    }

    const pc = createPeerConnection(stream)

    // Create and set local offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    console.log('[WebRTC] Created and set local offer, SDP:', offer.sdp?.substring(0, 100))

    // Send offer to remote
    sendSignal({ type: 'offer', offer: pc.localDescription })
  }, [initLocalStream, createPeerConnection, sendSignal])

  // ===== Patient: Join a call =====
  const joinCall = useCallback(async () => {
    console.log('[WebRTC] === JOINING CALL (Patient/Joiner) ===')
    isInitiatorRef.current = false
    setConnectionState('connecting')
    pendingCandidatesRef.current = []

    const stream = await initLocalStream()
    if (!stream) {
      console.error('[WebRTC] Cannot join call without local stream')
      return
    }

    // Create PC but don't create offer — wait for the doctor's offer
    createPeerConnection(stream)

    // Notify the room that we joined (the doctor will re-send the offer)
    sendSignal({ type: 'join' })
  }, [initLocalStream, createPeerConnection, sendSignal])

  // ===== Handle incoming signaling messages =====
  const handleSignalingMessage = useCallback(async (message) => {
    const myUserId = userIdRef.current
    if (message.userId === myUserId) {
      // Ignore own messages
      return
    }

    console.log(`[WebRTC] Received signaling message: ${message.type} from ${message.userId || 'unknown'}`)

    switch (message.type) {
      case 'join': {
        // Another participant joined the room
        // If we are the initiator (doctor), create a new offer to restart ICE gathering
        const pc = pcRef.current
        if (pc && isInitiatorRef.current) {
          console.log('[WebRTC] Remote peer joined, creating new offer to restart ICE')
          try {
            const offer = await pc.createOffer({ iceRestart: true })
            await pc.setLocalDescription(offer)
            sendSignal({ type: 'offer', offer: pc.localDescription })
          } catch (err) {
            console.error('[WebRTC] Failed to create ICE restart offer:', err)
          }
        }
        break
      }

      case 'offer': {
        console.log('[WebRTC] Received offer')
        let pc = pcRef.current

        // If we don't have a PC yet, create one with local stream
        if (!pc) {
          const stream = localStreamRef.current || await initLocalStream()
          pc = createPeerConnection(stream)
        }

        // Set the remote offer
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          // If we already have a local offer (glare condition), we rollback if we're not the initiator
          if (pc.signalingState === 'have-local-offer' && !isInitiatorRef.current) {
            console.log('[WebRTC] Rolling back local offer to accept remote offer')
            await pc.setLocalDescription({ type: 'rollback' })
          } else if (pc.signalingState === 'have-local-offer' && isInitiatorRef.current) {
            // We're the initiator and already have an offer — ignore incoming offer
            console.log('[WebRTC] Ignoring offer, we are the initiator')
            break
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(message.offer))
        console.log('[WebRTC] Set remote offer description')

        // Flush any buffered ICE candidates
        await flushPendingCandidates()

        // Create answer
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log('[WebRTC] Created and set local answer')

        sendSignal({ type: 'answer', answer: pc.localDescription })
        break
      }

      case 'answer': {
        console.log('[WebRTC] Received answer')
        const pc = pcRef.current
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer))
          console.log('[WebRTC] Set remote answer description')

          // Flush any buffered ICE candidates
          await flushPendingCandidates()
        } else {
          console.warn('[WebRTC] Ignoring answer, signaling state:', pc?.signalingState)
        }
        break
      }

      case 'ice-candidate': {
        const pc = pcRef.current
        if (pc && message.candidate) {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
              console.log('[WebRTC] Added ICE candidate directly')
            } catch (err) {
              console.error('[WebRTC] Error adding ICE candidate:', err)
            }
          } else {
            // Buffer candidates until remote description is set
            console.log('[WebRTC] Buffering ICE candidate (no remote description yet)')
            pendingCandidatesRef.current.push(message.candidate)
          }
        }
        break
      }

      case 'leave': {
        console.log('[WebRTC] Remote peer left')
        endCall()
        break
      }
    }
  }, [initLocalStream, createPeerConnection, sendSignal, flushPendingCandidates])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(prev => !prev)
    }
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setIsCameraOff(prev => !prev)
    }
  }, [])

  // End call
  const endCall = useCallback(() => {
    console.log('[WebRTC] === ENDING CALL ===')
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setConnectionState('ended')
    pendingCandidatesRef.current = []
    if (durationInterval.current) clearInterval(durationInterval.current)

    sendSignal({ type: 'leave' })
  }, [sendSignal])

  // Track call duration
  useEffect(() => {
    if (callStartTime) {
      durationInterval.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000))
      }, 1000)
    }
    return () => { if (durationInterval.current) clearInterval(durationInterval.current) }
  }, [callStartTime])

  return {
    localStream, remoteStream, connectionState,
    isMuted, isCameraOff, callDuration,
    startCall, joinCall, endCall,
    toggleMute, toggleCamera,
    handleSignalingMessage
  }
}
