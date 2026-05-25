package com.healthcare.controller;

import com.healthcare.dto.DoctorProfileDTO;
import com.healthcare.dto.DoctorSearchDTO;
import com.healthcare.dto.ReviewDTO;
import com.healthcare.model.*;
import com.healthcare.repository.*;
import com.healthcare.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorProfileRepository profileRepo;
    private final DoctorReviewRepository reviewRepo;
    private final UserRepository userRepo;
    private final AppointmentRepository appointmentRepo;
    private final JwtUtil jwtUtil;

    public DoctorController(DoctorProfileRepository profileRepo,
                            DoctorReviewRepository reviewRepo,
                            UserRepository userRepo,
                            AppointmentRepository appointmentRepo,
                            JwtUtil jwtUtil) {
        this.profileRepo = profileRepo;
        this.reviewRepo = reviewRepo;
        this.userRepo = userRepo;
        this.appointmentRepo = appointmentRepo;
        this.jwtUtil = jwtUtil;
    }

    // ===== Doctor Profile =====

    @PostMapping("/profile")
    public ResponseEntity<?> saveProfile(@RequestHeader("Authorization") String authHeader,
                                         @RequestBody DoctorProfileDTO dto) {
        String email = jwtUtil.extractEmail(authHeader.substring(7));
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null || user.getRole() != User.Role.DOCTOR) {
            return ResponseEntity.status(403).body("Only doctors can update profiles");
        }

        DoctorProfile profile = profileRepo.findByUser(user).orElse(new DoctorProfile());
        profile.setUser(user);
        mapDtoToProfile(dto, profile);
        profileRepo.save(profile);

        // Also sync consultation fee to User model for backward compatibility
        if (dto.getConsultationFee() != null) {
            user.setConsultationFee(dto.getConsultationFee());
            userRepo.save(user);
        }

        return ResponseEntity.ok(profile);
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable Long userId) {
        DoctorProfile profile = profileRepo.findByUser_Id(userId).orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toSearchDTO(profile));
    }

    // ===== Doctor Search =====

    @GetMapping("/search")
    public ResponseEntity<?> searchDoctors(
            @RequestParam(required = false) String doctorType,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) BigDecimal maxFee,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String name) {

        // Step 1: Get ALL active doctors from User table
        List<User> allDoctors = userRepo.findByRoleAndIsActive(User.Role.DOCTOR, true);

        // Step 2: Auto-create DoctorProfile for any doctor that doesn't have one yet
        // This ensures doctors registered before the profile feature still show up
        for (User doc : allDoctors) {
            if (profileRepo.findByUser_Id(doc.getId()).isEmpty()) {
                DoctorProfile newProfile = new DoctorProfile();
                newProfile.setUser(doc);
                newProfile.setDoctorType(DoctorProfile.DoctorType.ALLOPATHIC);
                // Sync consultation fee from User if available
                if (doc.getConsultationFee() != null) {
                    newProfile.setConsultationFee(doc.getConsultationFee());
                }
                profileRepo.save(newProfile);
            }
        }

        // Step 3: Now query from DoctorProfile with filters (all doctors guaranteed to have profiles)
        boolean hasFilters = (doctorType != null && !doctorType.isEmpty())
                || (specialization != null && !specialization.isEmpty())
                || minRating != null
                || maxFee != null
                || (city != null && !city.isEmpty())
                || (name != null && !name.isEmpty());

        List<DoctorProfile> profiles;

        if (hasFilters) {
            DoctorProfile.DoctorType typeEnum = null;
            if (doctorType != null && !doctorType.isEmpty()) {
                try {
                    typeEnum = DoctorProfile.DoctorType.valueOf(doctorType);
                } catch (IllegalArgumentException e) {
                    // Ignore invalid type
                }
            }
            profiles = profileRepo.searchDoctors(
                    typeEnum,
                    specialization != null && specialization.isEmpty() ? null : specialization,
                    minRating,
                    maxFee,
                    city != null && city.isEmpty() ? null : city,
                    name != null && name.isEmpty() ? null : name
            );
        } else {
            // No filters — return all active doctors
            profiles = profileRepo.findAllActive();
        }

        List<DoctorSearchDTO> results = profiles.stream()
                .map(this::toSearchDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(results);
    }

    // ===== Reviews =====

    @GetMapping("/{doctorId}/reviews")
    public ResponseEntity<?> getReviews(@PathVariable Long doctorId) {
        List<DoctorReview> reviews = reviewRepo.findByDoctor_IdOrderByCreatedAtDesc(doctorId);

        // Build response with patient names
        List<Map<String, Object>> result = new ArrayList<>();
        for (DoctorReview r : reviews) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("rating", r.getRating());
            map.put("reviewText", r.getReviewText());
            map.put("patientName", r.getPatient().getName());
            map.put("patientId", r.getPatient().getId());
            map.put("appointmentId", r.getAppointment().getId());
            map.put("createdAt", r.getCreatedAt());
            result.add(map);
        }

        // Also include rating distribution
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("reviews", result);
        response.put("averageRating", reviewRepo.averageRatingByDoctorId(doctorId));
        response.put("totalReviews", reviewRepo.countByDoctor_Id(doctorId));

        // Rating breakdown
        List<Object[]> dist = reviewRepo.ratingDistribution(doctorId);
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) breakdown.put(i, 0L);
        for (Object[] row : dist) {
            breakdown.put((Integer) row[0], (Long) row[1]);
        }
        response.put("ratingBreakdown", breakdown);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{doctorId}/reviews")
    public ResponseEntity<?> submitReview(@PathVariable Long doctorId,
                                          @RequestHeader("Authorization") String authHeader,
                                          @RequestBody ReviewDTO dto) {
        String email = jwtUtil.extractEmail(authHeader.substring(7));
        User patient = userRepo.findByEmail(email).orElse(null);
        if (patient == null || patient.getRole() != User.Role.PATIENT) {
            return ResponseEntity.status(403).body("Only patients can submit reviews");
        }

        // Validate rating
        if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5) {
            return ResponseEntity.badRequest().body("Rating must be between 1 and 5");
        }

        // Validate appointment exists and is completed
        Appointment appt = appointmentRepo.findById(dto.getAppointmentId()).orElse(null);
        if (appt == null) {
            return ResponseEntity.badRequest().body("Appointment not found");
        }
        if (appt.getStatus() != Appointment.Status.COMPLETED) {
            return ResponseEntity.badRequest().body("Can only review completed appointments");
        }
        if (!appt.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).body("You can only review your own appointments");
        }
        if (!appt.getDoctor().getId().equals(doctorId)) {
            return ResponseEntity.badRequest().body("Doctor ID mismatch with appointment");
        }

        // Check for duplicate review
        if (reviewRepo.findByPatient_IdAndAppointment_Id(patient.getId(), dto.getAppointmentId()).isPresent()) {
            return ResponseEntity.badRequest().body("You have already reviewed this appointment");
        }

        User doctor = userRepo.findById(doctorId).orElse(null);
        if (doctor == null || doctor.getRole() != User.Role.DOCTOR) {
            return ResponseEntity.badRequest().body("Doctor not found");
        }

        // Save review
        DoctorReview review = new DoctorReview();
        review.setDoctor(doctor);
        review.setPatient(patient);
        review.setAppointment(appt);
        review.setRating(dto.getRating());
        review.setReviewText(dto.getReviewText());
        reviewRepo.save(review);

        // Update denormalized rating on doctor profile
        DoctorProfile profile = profileRepo.findByUser_Id(doctorId).orElse(null);
        if (profile != null) {
            Double avgRating = reviewRepo.averageRatingByDoctorId(doctorId);
            long totalReviews = reviewRepo.countByDoctor_Id(doctorId);
            profile.setAverageRating(avgRating != null ? avgRating : 0.0);
            profile.setTotalReviews((int) totalReviews);
            profileRepo.save(profile);
        }

        return ResponseEntity.ok(Map.of("message", "Review submitted successfully", "reviewId", review.getId()));
    }

    // ===== Check if already reviewed =====

    @GetMapping("/{doctorId}/reviews/check")
    public ResponseEntity<?> checkReview(@PathVariable Long doctorId,
                                         @RequestParam Long patientId,
                                         @RequestParam Long appointmentId) {
        boolean exists = reviewRepo.findByPatient_IdAndAppointment_Id(patientId, appointmentId).isPresent();
        return ResponseEntity.ok(Map.of("reviewed", exists));
    }

    // ===== Helpers =====

    private void mapDtoToProfile(DoctorProfileDTO dto, DoctorProfile profile) {
        if (dto.getDoctorType() != null) {
            try {
                profile.setDoctorType(DoctorProfile.DoctorType.valueOf(dto.getDoctorType()));
            } catch (IllegalArgumentException e) {
                profile.setDoctorType(DoctorProfile.DoctorType.ALLOPATHIC);
            }
        }
        if (dto.getDegree() != null) profile.setDegree(dto.getDegree());
        if (dto.getSpecialization() != null) profile.setSpecialization(dto.getSpecialization());
        if (dto.getHospitalAffiliation() != null) profile.setHospitalAffiliation(dto.getHospitalAffiliation());
        if (dto.getEducation() != null) profile.setEducation(dto.getEducation());
        if (dto.getExperienceYears() != null) profile.setExperienceYears(dto.getExperienceYears());
        if (dto.getConsultationFee() != null) profile.setConsultationFee(dto.getConsultationFee());
        if (dto.getCity() != null) profile.setCity(dto.getCity());
        if (dto.getState() != null) profile.setState(dto.getState());
        if (dto.getFullAddress() != null) profile.setFullAddress(dto.getFullAddress());
        if (dto.getLatitude() != null) profile.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) profile.setLongitude(dto.getLongitude());
        if (dto.getLanguages() != null) profile.setLanguages(dto.getLanguages());
        if (dto.getLicenseNumber() != null) profile.setLicenseNumber(dto.getLicenseNumber());
        if (dto.getRegistrationCouncil() != null) profile.setRegistrationCouncil(dto.getRegistrationCouncil());
        if (dto.getBio() != null) profile.setBio(dto.getBio());
        if (dto.getAvailableDays() != null) profile.setAvailableDays(dto.getAvailableDays());
    }

    private DoctorSearchDTO toSearchDTO(DoctorProfile dp) {
        DoctorSearchDTO dto = new DoctorSearchDTO();
        User u = dp.getUser();
        dto.setUserId(u.getId());
        dto.setName(u.getName());
        dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone());
        dto.setProfilePicture(u.getProfilePicture());

        dto.setProfileId(dp.getId());
        dto.setDoctorType(dp.getDoctorType() != null ? dp.getDoctorType().name() : null);
        dto.setDegree(dp.getDegree());
        dto.setSpecialization(dp.getSpecialization());
        dto.setHospitalAffiliation(dp.getHospitalAffiliation());
        dto.setEducation(dp.getEducation());
        dto.setExperienceYears(dp.getExperienceYears());
        dto.setConsultationFee(dp.getConsultationFee());
        dto.setCity(dp.getCity());
        dto.setState(dp.getState());
        dto.setFullAddress(dp.getFullAddress());
        dto.setLatitude(dp.getLatitude());
        dto.setLongitude(dp.getLongitude());
        dto.setLanguages(dp.getLanguages());
        dto.setLicenseNumber(dp.getLicenseNumber());
        dto.setRegistrationCouncil(dp.getRegistrationCouncil());
        dto.setBio(dp.getBio());
        dto.setAvailableDays(dp.getAvailableDays());
        dto.setAverageRating(dp.getAverageRating());
        dto.setTotalReviews(dp.getTotalReviews());

        return dto;
    }
}
