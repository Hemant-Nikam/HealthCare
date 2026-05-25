package com.healthcare.controller;

import com.healthcare.model.Notification;
import com.healthcare.model.User;
import com.healthcare.repository.NotificationRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository, JwtUtil jwtUtil) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getUserNotifications(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromToken(authHeader);
        if (user == null) return ResponseEntity.status(403).build();

        List<Notification> notifications = notificationRepository.findByUser_IdOrderByCreatedAtDesc(user.getId());
        long unreadCount = notificationRepository.countByUser_IdAndIsReadFalse(user.getId());

        return ResponseEntity.ok(Map.of(
            "notifications", notifications,
            "unreadCount", unreadCount
        ));
    }

    @PostMapping("/mark-read")
    @Transactional
    public ResponseEntity<?> markAllAsRead(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromToken(authHeader);
        if (user == null) return ResponseEntity.status(403).build();

        notificationRepository.markAllAsReadByUserId(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    private User getUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String email = jwtUtil.extractEmail(authHeader.substring(7));
        return userRepository.findByEmail(email).orElse(null);
    }
}
