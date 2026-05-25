package com.healthcare.controller;

import com.healthcare.model.Appointment;
import com.healthcare.model.DoctorAvailability;
import com.healthcare.model.User;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.DoctorAvailabilityRepository;
import com.healthcare.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/availability")
public class DoctorAvailabilityController {

    private final DoctorAvailabilityRepository availabilityRepo;
    private final AppointmentRepository appointmentRepo;
    private final UserRepository userRepo;

    public DoctorAvailabilityController(DoctorAvailabilityRepository availabilityRepo,
                                         AppointmentRepository appointmentRepo,
                                         UserRepository userRepo) {
        this.availabilityRepo = availabilityRepo;
        this.appointmentRepo = appointmentRepo;
        this.userRepo = userRepo;
    }

    @PostMapping("/mark")
    public ResponseEntity<?> markAbsent(@RequestBody Map<String, Object> body) {
        Long doctorId = Long.valueOf(body.get("doctorId").toString());
        LocalDate date = LocalDate.parse(body.get("date").toString());
        String absenceType = body.getOrDefault("absenceType", "FULL_DAY").toString();
        String timeslot = body.getOrDefault("timeslot", "").toString();
        String reason = body.getOrDefault("reason", "").toString();

        User doctor = userRepo.findById(doctorId).orElseThrow();

        DoctorAvailability da = new DoctorAvailability();
        da.setDoctor(doctor);
        da.setUnavailableDate(date);
        da.setAbsenceType(DoctorAvailability.AbsenceType.valueOf(absenceType));
        da.setReason(reason);

        if ("TIMESLOT".equals(absenceType) && !timeslot.isEmpty()) {
            da.setUnavailableTimeslot(timeslot);
        }

        availabilityRepo.save(da);

        // Cancel conflicting appointments
        List<Appointment.Status> activeStatuses = List.of(
                Appointment.Status.PENDING, Appointment.Status.CONFIRMED);
        List<Appointment> conflicting = appointmentRepo
                .findByDoctorIdAndAppointmentDateAndStatusIn(doctorId, date, activeStatuses);

        int cancelledCount = 0;
        for (Appointment appt : conflicting) {
            if ("FULL_DAY".equals(absenceType)) {
                appt.setStatus(Appointment.Status.CANCELLED);
                appt.setNotes("Cancelled: Doctor unavailable on this date");
                appointmentRepo.save(appt);
                cancelledCount++;
            } else if ("TIMESLOT".equals(absenceType) && !timeslot.isEmpty()) {
                String apptTime = appt.getAppointmentTime().toString();
                if (apptTime.startsWith(timeslot) || timeslot.equals(apptTime)) {
                    appt.setStatus(Appointment.Status.CANCELLED);
                    appt.setNotes("Cancelled: Doctor unavailable at this time");
                    appointmentRepo.save(appt);
                    cancelledCount++;
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("availability", da);
        response.put("cancelledAppointments", cancelledCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{doctorId}")
    public ResponseEntity<?> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(
                availabilityRepo.findByDoctorIdAndUnavailableDateGreaterThanEqual(
                        doctorId, LocalDate.now().minusDays(1)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable Long id) {
        availabilityRepo.deleteById(id);
        return ResponseEntity.ok("Removed");
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkSlot(
            @RequestParam Long doctorId,
            @RequestParam String date,
            @RequestParam(required = false) String time) {
        LocalDate localDate = LocalDate.parse(date);
        List<DoctorAvailability> absences = availabilityRepo
                .findByDoctorIdAndUnavailableDate(doctorId, localDate);

        boolean available = true;
        String reason = "";

        for (DoctorAvailability da : absences) {
            if (da.getAbsenceType() == DoctorAvailability.AbsenceType.FULL_DAY) {
                available = false;
                reason = "Doctor is unavailable on this date" +
                        (da.getReason() != null && !da.getReason().isEmpty() ? ": " + da.getReason() : "");
                break;
            }
            if (da.getAbsenceType() == DoctorAvailability.AbsenceType.TIMESLOT
                    && time != null && !time.isEmpty()) {
                if (da.getUnavailableTimeslot() != null && da.getUnavailableTimeslot().equals(time)) {
                    available = false;
                    reason = "Doctor is unavailable at this time slot";
                    break;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("available", available);
        result.put("reason", reason);
        result.put("absences", absences);
        return ResponseEntity.ok(result);
    }
}
