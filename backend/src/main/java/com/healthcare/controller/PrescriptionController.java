package com.healthcare.controller;

import com.healthcare.model.Prescription;
import com.healthcare.model.PrescriptionMedicine;
import com.healthcare.model.User;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.PrescriptionRepository;
import com.healthcare.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionRepository prescriptionRepo;
    private final UserRepository userRepo;
    private final AppointmentRepository appointmentRepo;

    public PrescriptionController(PrescriptionRepository prescriptionRepo,
                                  UserRepository userRepo,
                                  AppointmentRepository appointmentRepo) {
        this.prescriptionRepo = prescriptionRepo;
        this.userRepo = userRepo;
        this.appointmentRepo = appointmentRepo;
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(body.get("patientId").toString());
        Long doctorId  = Long.valueOf(body.get("doctorId").toString());

        User patient = userRepo.findById(patientId).orElseThrow();
        User doctor  = userRepo.findById(doctorId).orElseThrow();

        Prescription rx = new Prescription();
        rx.setPatient(patient);
        rx.setDoctor(doctor);
        rx.setDiagnosis(body.getOrDefault("diagnosis", "").toString());
        rx.setNotes(body.getOrDefault("notes", "").toString());

        if (body.containsKey("appointmentId") && body.get("appointmentId") != null) {
            appointmentRepo.findById(Long.valueOf(body.get("appointmentId").toString()))
                    .ifPresent(rx::setAppointment);
        }

        Prescription saved = prescriptionRepo.save(rx);

        // Add medicines
        if (body.containsKey("medicines")) {
            List<Map<String, String>> meds = (List<Map<String, String>>) body.get("medicines");
            List<PrescriptionMedicine> medicines = meds.stream().map(m -> {
                PrescriptionMedicine pm = new PrescriptionMedicine();
                pm.setPrescription(saved);
                pm.setMedicineName(m.getOrDefault("medicineName", ""));
                pm.setDosage(m.getOrDefault("dosage", ""));
                pm.setFrequency(m.getOrDefault("frequency", ""));
                pm.setDuration(m.getOrDefault("duration", ""));
                pm.setInstructions(m.getOrDefault("instructions", ""));
                return pm;
            }).collect(Collectors.toList());
            saved.setMedicines(medicines);
            prescriptionRepo.save(saved);
        }

        // Re-fetch to ensure fully hydrated response with patient/doctor names
        Prescription result = prescriptionRepo.findById(saved.getId()).orElse(saved);
        // Force initialization of lazy-loaded associations
        if (result.getPatient() != null) result.getPatient().getName();
        if (result.getDoctor() != null) result.getDoctor().getName();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(prescriptionRepo.findByPatientIdOrderByCreatedAtDesc(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<?> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(prescriptionRepo.findByDoctorIdOrderByCreatedAtDesc(doctorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return prescriptionRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
