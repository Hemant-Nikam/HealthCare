import { useRef, useCallback, useEffect } from 'react'
import { useGlobalSignaling } from '../contexts/SignalingContext'

export function useSignaling() {
  const { connected, send, subscribeToRoom } = useGlobalSignaling()
  const roomIdRef = useRef(null)
  const unsubscribeRef = useRef(null)

  const connect = useCallback((roomId, onMessage) => {
    roomIdRef.current = roomId
    
    // Subscribe to room messages
    if (unsubscribeRef.current) unsubscribeRef.current()
    unsubscribeRef.current = subscribeToRoom(onMessage)

    // Join the room
    send({
      type: 'join',
      roomId: roomId
    })

    return Promise.resolve()
  }, [send, subscribeToRoom])

  const sendRoomMessage = useCallback((message) => {
    if (roomIdRef.current) {
      send({
        ...message,
        roomId: roomIdRef.current
      })
    }
  }, [send])

  const disconnect = useCallback(() => {
    // Optionally we could send a 'leave' message here if we wanted
    // send({ type: 'leave', roomId: roomIdRef.current })
    roomIdRef.current = null
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Provide the same API as before
  return { connected, connect, send: sendRoomMessage, disconnect }
}