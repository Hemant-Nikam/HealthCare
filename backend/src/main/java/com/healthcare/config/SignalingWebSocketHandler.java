package com.healthcare.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingWebSocketHandler extends TextWebSocketHandler {

    // Map of roomId -> set of WebSocketSessions (for WebRTC streams)
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    
    // Map of userId -> WebSocketSession (for direct global messaging/ringing)
    private final Map<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();
    
    // Map of WebSocketSession.id -> userId (for reverse lookup on disconnect)
    private final Map<String, String> sessionToUserId = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("[Signaling] WebSocket connection established: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();

        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");

            // Handle Global Events (Registration & Ringing)
            if ("register".equals(type)) {
                String userId = (String) data.get("userId");
                if (userId != null) {
                    userSessions.put(userId, session);
                    sessionToUserId.put(session.getId(), userId);
                    System.out.println("[Signaling] Registered userId " + userId + " to session " + session.getId());
                }
                return;
            }

            if ("call_invite".equals(type) || "call_accept".equals(type) || "call_decline".equals(type) || "call_cancel".equals(type)) {
                String targetUserId = (String) data.get("targetUserId");
                if (targetUserId != null) {
                    WebSocketSession targetSession = userSessions.get(targetUserId);
                    if (targetSession != null && targetSession.isOpen()) {
                        targetSession.sendMessage(new TextMessage(payload));
                        System.out.println("[Signaling] Routed " + type + " to userId " + targetUserId);
                    } else {
                        System.out.println("[Signaling] Target userId " + targetUserId + " is not connected");
                        // If doctor rings a patient who is offline, tell doctor they are offline
                        if ("call_invite".equals(type)) {
                            Map<String, Object> errorMsg = Map.of(
                                "type", "call_error",
                                "message", "User is offline"
                            );
                            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMsg)));
                        }
                    }
                }
                return;
            }

            // Handle WebRTC Room Events (Offer, Answer, ICE Candidate, Join)
            String roomId = (String) data.get("roomId");
            if (roomId == null) {
                return;
            }

            if ("join".equals(type)) {
                Set<WebSocketSession> roomSessions = rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet());
                roomSessions.add(session);
                System.out.println("[Signaling] Session " + session.getId() + " joined room " + roomId);
            }

            // Broadcast message to all OTHER participants in the room
            Set<WebSocketSession> roomSessions = rooms.get(roomId);
            if (roomSessions != null) {
                for (WebSocketSession s : roomSessions) {
                    if (s.isOpen() && !s.getId().equals(session.getId())) {
                        try {
                            s.sendMessage(new TextMessage(payload));
                        } catch (IOException e) {
                            roomSessions.remove(s);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[Signaling] Error processing WebSocket message: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // Remove from rooms
        rooms.values().forEach(roomSessions -> roomSessions.remove(session));
        
        // Remove from userSessions
        String userId = sessionToUserId.remove(session.getId());
        if (userId != null) {
            userSessions.remove(userId);
            System.out.println("[Signaling] Unregistered userId " + userId);
        }
        
        System.out.println("[Signaling] WebSocket connection closed: " + session.getId());
    }
}
