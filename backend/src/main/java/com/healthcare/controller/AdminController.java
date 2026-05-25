package com.healthcare.controller;

import com.healthcare.model.User;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepo;
    private final AppointmentRepository appointmentRepo;

    public AdminController(UserRepository userRepo, AppointmentRepository appointmentRepo) {
        this.userRepo = userRepo;
        this.appointmentRepo = appointmentRepo;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(Map.of(
            "totalPatients",  userRepo.countByRole(User.Role.PATIENT),
            "totalDoctors",   userRepo.countByRole(User.Role.DOCTOR),
            "totalAppointments", appointmentRepo.countTotal(),
            "pendingAppointments", appointmentRepo.countPending()
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<?> allUsers() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    @GetMapping("/patients")
    public ResponseEntity<?> patients() {
        return ResponseEntity.ok(userRepo.findByRole(User.Role.PATIENT));
    }

    @GetMapping("/doctors")
    public ResponseEntity<?> doctors() {
        return ResponseEntity.ok(userRepo.findByRole(User.Role.DOCTOR));
    }

    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable Long id) {
        return userRepo.findById(id).map(user -> {
            user.setIsActive(!user.getIsActive());
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("active", user.getIsActive(), "message",
                    user.getIsActive() ? "User activated" : "User deactivated"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepo.existsById(id)) return ResponseEntity.notFound().build();
        userRepo.deleteById(id);
        return ResponseEntity.ok("User deleted");
    }
}
