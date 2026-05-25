package com.healthcare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    @GetMapping("/contacts")
    public ResponseEntity<?> getEmergencyContacts() {
        return ResponseEntity.ok(List.of(
            Map.of("name", "Ambulance", "number", "108", "icon", "🚑"),
            Map.of("name", "Police", "number", "100", "icon", "🚔"),
            Map.of("name", "Fire", "number", "101", "icon", "🚒"),
            Map.of("name", "Women Helpline", "number", "1091", "icon", "👮"),
            Map.of("name", "Disaster Mgmt", "number", "1077", "icon", "⚠️"),
            Map.of("name", "Child Helpline", "number", "1098", "icon", "👶")
        ));
    }

    @PostMapping("/alert")
    public ResponseEntity<?> sendAlert(@RequestBody Map<String, String> body) {
        // In production: send SMS/notification via Twilio or Firebase
        System.out.println("EMERGENCY ALERT: " + body);
        return ResponseEntity.ok(Map.of(
            "message", "Emergency alert registered. Help is on the way!",
            "alertId", System.currentTimeMillis()
        ));
    }
}
