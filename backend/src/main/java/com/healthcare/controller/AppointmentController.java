package com.healthcare.controller;

import com.healthcare.model.Appointment;
import com.healthcare.model.User;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentRepository appointmentRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public AppointmentController(AppointmentRepository appointmentRepo, UserRepository userRepo, NotificationService notificationService) {
        this.appointmentRepo = appointmentRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    @PostMapping
    public ResponseEntity<?> book(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(body.get("patientId").toString());
        Long doctorId  = Long.valueOf(body.get("doctorId").toString());

        User patient = userRepo.findById(patientId).orElseThrow();
        User doctor  = userRepo.findById(doctorId).orElseThrow();

        Appointment appt = new Appointment();
        appt.setPatient(patient);
        appt.setDoctor(doctor);
        appt.setAppointmentDate(LocalDate.parse(body.get("appointmentDate").toString()));
        // Note: appointmentTime is left null initially. The doctor will set it.
        appt.setReason(body.getOrDefault("reason", "").toString());
        appt.setStatus(Appointment.Status.PENDING);

        return ResponseEntity.ok(appointmentRepo.save(appt));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentRepo.findByPatientIdOrderByAppointmentDateDesc(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<?> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(appointmentRepo.findByDoctorIdOrderByAppointmentDateDesc(doctorId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return appointmentRepo.findById(id).map(appt -> {
            appt.setStatus(Appointment.Status.valueOf(body.get("status")));
            if (body.containsKey("notes")) appt.setNotes(body.get("notes"));
            return ResponseEntity.ok(appointmentRepo.save(appt));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/schedule")
    public ResponseEntity<?> reschedule(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Appointment appt = appointmentRepo.findById(id).orElse(null);
        if (appt == null) return ResponseEntity.notFound().build();

        LocalDate newDate = LocalDate.parse(body.get("appointmentDate"));
        LocalTime newTime = LocalTime.parse(body.get("appointmentTime"));
        
        List<Appointment.Status> activeStatuses = Arrays.asList(Appointment.Status.PENDING, Appointment.Status.CONFIRMED);

        // Conflict check for doctor
        if (appointmentRepo.existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                appt.getDoctor().getId(), newDate, newTime, activeStatuses)) {
            // Wait, we need to make sure the conflicting appointment is not THIS appointment
            List<Appointment> conflicts = appointmentRepo.findByDoctorIdAndAppointmentDateAndStatusIn(
                    appt.getDoctor().getId(), newDate, activeStatuses);
            boolean isConflict = conflicts.stream().anyMatch(a -> !a.getId().equals(appt.getId()) && a.getAppointmentTime() != null && a.getAppointmentTime().equals(newTime));
            if (isConflict) {
                return ResponseEntity.badRequest().body(Map.of("error", "Doctor already has an appointment at this time."));
            }
        }

        // Conflict check for patient
        // We do a manual check similar to doctor to exclude THIS appointment
        // We'll skip complex DB query and just fetch patient's active appointments
        List<Appointment> patientActive = appointmentRepo.findByPatientIdOrderByAppointmentDateDesc(appt.getPatient().getId())
                .stream()
                .filter(a -> activeStatuses.contains(a.getStatus()) && a.getAppointmentDate().equals(newDate))
                .toList();
        
        boolean patientConflict = patientActive.stream().anyMatch(a -> !a.getId().equals(appt.getId()) && a.getAppointmentTime() != null && a.getAppointmentTime().equals(newTime));
        if (patientConflict) {
            return ResponseEntity.badRequest().body(Map.of("error", "Patient already has an appointment at this time."));
        }

        boolean isNewAssignment = (appt.getAppointmentTime() == null);
        
        appt.setAppointmentDate(newDate);
        appt.setAppointmentTime(newTime);
        // Automatically confirm if doctor assigns a time (optional logic, but let's leave status as is or update if passed)
        if (body.containsKey("status")) {
            appt.setStatus(Appointment.Status.valueOf(body.get("status")));
        } else if (appt.getStatus() == Appointment.Status.PENDING) {
            appt.setStatus(Appointment.Status.CONFIRMED); // auto-confirm when time is set
        }

        appointmentRepo.save(appt);

        // Trigger Notification
        notificationService.sendAppointmentUpdateNotification(appt.getPatient(), appt.getDoctor(), newDate, newTime, isNewAssignment);

        return ResponseEntity.ok(appt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        return appointmentRepo.findById(id).map(appt -> {
            appt.setStatus(Appointment.Status.CANCELLED);
            appointmentRepo.save(appt);
            return ResponseEntity.ok("Cancelled");
        }).orElse(ResponseEntity.notFound().build());
    }
}
