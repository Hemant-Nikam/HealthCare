import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { BASE_URL } from '../services/api'

const SignalingContext = createContext(null)

export const SignalingProvider = ({ children }) => {
  const { user } = useAuth()
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimerRef = useRef(null)
  
  // Handlers for specific room events
  const roomHandlersRef = useRef(new Set())
  
  // Handlers for global events (like call_invite)
  const globalHandlersRef = useRef(new Set())

  const connect = useCallback(() => {
    if (!user) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
    }

    try {
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Convert HTTP BASE_URL to WS URL
      let wsUrl = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')
      // Remove trailing /api if present, and append /ws/signal
      if (wsUrl.endsWith('/api')) {
        wsUrl = wsUrl.substring(0, wsUrl.length - 4)
      }
      wsUrl = `${wsUrl}/ws/signal`
      
      console.log('[Global Signaling] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Global Signaling] ✅ Connected');
        setConnected(true);
        // Register user globally
        ws.send(JSON.stringify({
          type: 'register',
          userId: user.userId.toString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Global Signaling] 📩 Received:', data.type);
          
          // Notify all registered global handlers
          globalHandlersRef.current.forEach(handler => handler(data));
          
          // Notify all room-specific handlers if it's a room event
          if (data.roomId) {
            roomHandlersRef.current.forEach(handler => handler(data));
          }
        } catch (e) {
          console.error('[Global Signaling] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[Global Signaling] ❌ WebSocket error:', err);
      };

      ws.onclose = (event) => {
        console.log('[Global Signaling] Disconnected, code:', event.code);
        setConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect if logged in
        if (event.code !== 1000 && user) {
          console.log('[Global Signaling] Attempting reconnect in 2s...');
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };
    } catch (err) {
      console.error('[Global Signaling] Connection error:', err);
      setConnected(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close(1000, 'User logged out');
        wsRef.current = null;
      }
      setConnected(false);
    }
    
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Cleanup');
      }
    }
  }, [user, connect]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Global Signaling] 📤 Sending:', message.type);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[Global Signaling] Cannot send, WebSocket not open.');
    }
  }, []);

  const subscribeToRoom = useCallback((handler) => {
    roomHandlersRef.current.add(handler);
    return () => roomHandlersRef.current.delete(handler);
  }, []);

  const subscribeGlobal = useCallback((handler) => {
    globalHandlersRef.current.add(handler);
    return () => globalHandlersRef.current.delete(handler);
  }, []);

  return (
    <SignalingContext.Provider value={{ connected, send, subscribeToRoom, subscribeGlobal }}>
      {children}
    </SignalingContext.Provider>
  )
}

export const useGlobalSignaling = () => {
  const context = useContext(SignalingContext)
  if (!context) throw new Error('useGlobalSignaling must be used within SignalingProvider')
  return context
}
