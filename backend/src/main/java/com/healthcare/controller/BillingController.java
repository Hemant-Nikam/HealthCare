package com.healthcare.controller;

import com.healthcare.model.Billing;
import com.healthcare.model.Appointment;
import com.healthcare.model.User;
import com.healthcare.repository.BillingRepository;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingRepository billingRepo;
    private final UserRepository userRepo;
    private final AppointmentRepository appointmentRepo;

    public BillingController(BillingRepository billingRepo,
                             UserRepository userRepo,
                             AppointmentRepository appointmentRepo) {
        this.billingRepo = billingRepo;
        this.userRepo = userRepo;
        this.appointmentRepo = appointmentRepo;
    }

    @PostMapping("/request")
    public ResponseEntity<?> createRequest(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(body.get("patientId").toString());
        Long doctorId = Long.valueOf(body.get("doctorId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String description = body.getOrDefault("description", "").toString();
        String consultationType = body.getOrDefault("consultationType", "IN_PERSON").toString();

        User patient = userRepo.findById(patientId).orElseThrow();
        User doctor = userRepo.findById(doctorId).orElseThrow();

        Billing billing = new Billing();
        billing.setPatient(patient);
        billing.setDoctor(doctor);
        billing.setAmount(amount);
        billing.setDescription(description);
        billing.setConsultationType(Billing.ConsultationType.valueOf(consultationType));

        if (body.containsKey("appointmentId") && body.get("appointmentId") != null) {
            appointmentRepo.findById(Long.valueOf(body.get("appointmentId").toString()))
                    .ifPresent(billing::setAppointment);
        }

        Billing saved = billingRepo.save(billing);
        // Force init lazy
        if (saved.getPatient() != null) saved.getPatient().getName();
        if (saved.getDoctor() != null) saved.getDoctor().getName();
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<?> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(billingRepo.findByDoctorIdOrderByRequestedAtDesc(doctorId));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(billingRepo.findByPatientIdOrderByRequestedAtDesc(patientId));
    }

    @PatchMapping("/{id}/pay")
    public ResponseEntity<?> markPaid(@PathVariable Long id) {
        return billingRepo.findById(id).map(billing -> {
            billing.setStatus(Billing.BillingStatus.PAID);
            billing.setPaidAt(LocalDateTime.now());
            Billing saved = billingRepo.save(billing);
            if (saved.getPatient() != null) saved.getPatient().getName();
            if (saved.getDoctor() != null) saved.getDoctor().getName();
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats/{doctorId}")
    public ResponseEntity<?> getDoctorStats(@PathVariable Long doctorId) {
        BigDecimal totalEarned = billingRepo.sumPaidByDoctorId(doctorId);
        BigDecimal pendingAmount = billingRepo.sumPendingByDoctorId(doctorId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEarned", totalEarned);
        stats.put("pendingAmount", pendingAmount);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/patient/{patientId}")
    public ResponseEntity<?> getPatientStats(@PathVariable Long patientId) {
        BigDecimal totalSpent = billingRepo.sumPaidByPatientId(patientId);
        BigDecimal pendingAmount = billingRepo.sumPendingByPatientId(patientId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSpent", totalSpent);
        stats.put("pendingAmount", pendingAmount);
        return ResponseEntity.ok(stats);
    }
}
