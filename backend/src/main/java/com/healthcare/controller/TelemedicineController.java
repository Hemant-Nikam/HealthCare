package com.healthcare.controller;

import com.healthcare.service.OtpService;
import com.healthcare.model.User;
import com.healthcare.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/telemedicine")
public class TelemedicineController {

    private final OtpService otpService;
    private final UserRepository userRepo;

    public TelemedicineController(OtpService otpService, UserRepository userRepo) {
        this.otpService = otpService;
        this.userRepo = userRepo;
    }

    @PostMapping("/invite")
    public ResponseEntity<?> sendInvite(@RequestBody Map<String, Object> body) {
        String patientEmail = (String) body.get("patientEmail");
        String roomId = (String) body.get("roomId");
        Long doctorId = body.get("doctorId") != null ? Long.valueOf(body.get("doctorId").toString()) : null;

        if (patientEmail == null || patientEmail.isBlank() || roomId == null || roomId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "patientEmail and roomId are required"));
        }

        String doctorName = "Your Doctor";
        if (doctorId != null) {
            User doctor = userRepo.findById(doctorId).orElse(null);
            if (doctor != null) {
                doctorName = doctor.getName();
            }
        }

        try {
            otpService.sendVideoCallInvite(patientEmail, roomId, doctorName);
            return ResponseEntity.ok(Map.of("message", "Invite sent successfully to " + patientEmail));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to send email invite: " + e.getMessage()));
        }
    }
}
