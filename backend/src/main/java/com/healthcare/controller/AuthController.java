package com.healthcare.controller;

import com.healthcare.dto.*;
import com.healthcare.model.DoctorProfile;
import com.healthcare.model.User;
import com.healthcare.repository.DoctorProfileRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.security.JwtUtil;
import com.healthcare.service.GoogleAuthService;
import com.healthcare.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final GoogleAuthService googleAuthService;

    public AuthController(UserRepository userRepository,
                          DoctorProfileRepository doctorProfileRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          OtpService otpService,
                          GoogleAuthService googleAuthService) {
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
        this.googleAuthService = googleAuthService;
    }

    // ===== OTP Endpoints =====

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest req) {
        try {
            otpService.generateAndSendOtp(req.getEmail());
            return ResponseEntity.ok(Map.of("message", "OTP sent successfully", "email", req.getEmail()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to send OTP: " + e.getMessage());
        }
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody OtpVerifyRequest req) {
        boolean verified = otpService.verifyOtp(req.getEmail(), req.getOtp());
        if (verified) {
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully", "verified", true));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP", "verified", false));
        }
    }

    // ===== Registration (with OTP verification) =====

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);

        if (user != null) {
            // If user exists and was created via LOCAL registration, reject
            if (user.getAuthProvider() == User.AuthProvider.LOCAL) {
                return ResponseEntity.badRequest().body("Email already registered");
            }
            // If user exists via GOOGLE, we allow them to set a password and update their profile
        }

        // Verify that OTP was completed for this email
        if (!otpService.isEmailVerified(req.getEmail())) {
            return ResponseEntity.badRequest().body("Email not verified. Please complete OTP verification first.");
        }

        if (user == null) {
            user = new User();
            user.setEmail(req.getEmail());
            user.setAuthProvider(User.AuthProvider.LOCAL);
        } else {
            // Upgrading Google account to also support LOCAL login
            user.setAuthProvider(User.AuthProvider.LOCAL); 
        }

        user.setName(req.getName());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setPhone(req.getPhone());
        user.setRole(User.Role.valueOf(req.getRole() != null ? req.getRole() : "PATIENT"));
        user.setEmailVerified(true);
        if (user.getIsActive() == null) {
            user.setIsActive(true);
        }

        userRepository.save(user);

        // If registering as DOCTOR with profile data, create DoctorProfile
        if (user.getRole() == User.Role.DOCTOR && req.getDoctorProfile() != null) {
            DoctorProfileDTO dpDto = req.getDoctorProfile();
            DoctorProfile profile = doctorProfileRepository.findByUser(user).orElse(new DoctorProfile());
            profile.setUser(user);
            if (dpDto.getDoctorType() != null) {
                try { profile.setDoctorType(DoctorProfile.DoctorType.valueOf(dpDto.getDoctorType())); }
                catch (IllegalArgumentException e) { profile.setDoctorType(DoctorProfile.DoctorType.ALLOPATHIC); }
            }
            profile.setDegree(dpDto.getDegree());
            profile.setSpecialization(dpDto.getSpecialization());
            profile.setHospitalAffiliation(dpDto.getHospitalAffiliation());
            profile.setEducation(dpDto.getEducation());
            profile.setExperienceYears(dpDto.getExperienceYears());
            profile.setConsultationFee(dpDto.getConsultationFee());
            profile.setCity(dpDto.getCity());
            profile.setState(dpDto.getState());
            profile.setFullAddress(dpDto.getFullAddress());
            profile.setLatitude(dpDto.getLatitude());
            profile.setLongitude(dpDto.getLongitude());
            profile.setLanguages(dpDto.getLanguages());
            profile.setLicenseNumber(dpDto.getLicenseNumber());
            profile.setRegistrationCouncil(dpDto.getRegistrationCouncil());
            profile.setBio(dpDto.getBio());
            profile.setAvailableDays(dpDto.getAvailableDays());
            doctorProfileRepository.save(profile);

            // Sync fee to User for backward compat
            if (dpDto.getConsultationFee() != null) {
                user.setConsultationFee(dpDto.getConsultationFee());
                userRepository.save(user);
            }
        }

        // Cleanup OTP tokens
        otpService.cleanupOtps(req.getEmail());

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getName(), user.getId()));
    }

    // ===== Login =====

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        if (user.getAuthProvider() == User.AuthProvider.GOOGLE && 
            !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("This account uses Google Sign-In. Please click the 'Sign in with Google' button below.");
        }

        if (user.getPassword() == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        if (!user.getIsActive()) {
            return ResponseEntity.status(403).body("Account is deactivated");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getName(), user.getId()));
    }

    // ===== Google OAuth =====

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleAuthRequest req) {
        try {
            Map<String, String> googleUser = googleAuthService.verifyGoogleToken(req.getCredential());

            String email = googleUser.get("email");
            String name = googleUser.get("name");
            String picture = googleUser.get("picture");

            // Find existing user or create new one
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                // Create new user from Google account
                user = new User();
                user.setName(name);
                user.setEmail(email);
                // Assign a random password to satisfy the database NOT NULL constraint
                user.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                user.setRole(User.Role.PATIENT);
                user.setAuthProvider(User.AuthProvider.GOOGLE);
                user.setProfilePicture(picture);
                user.setEmailVerified(true);
                user.setIsActive(true);
                userRepository.save(user);
            } else {
                // Update existing user's Google info
                if (picture != null && !picture.isEmpty()) {
                    user.setProfilePicture(picture);
                }
                if (user.getAuthProvider() == User.AuthProvider.LOCAL) {
                    // User already registered with email — allow Google login too
                    user.setEmailVerified(true);
                }
                userRepository.save(user);
            }

            if (!user.getIsActive()) {
                return ResponseEntity.status(403).body("Account is deactivated");
            }

            String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
            return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getName(), user.getId()));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Google authentication failed: " + e.getMessage());
        }
    }

    // ===== Me =====

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtUtil.extractEmail(token);
        return userRepository.findByEmail(email)
                .map(u -> ResponseEntity.ok(new AuthResponse(null, u.getRole().name(), u.getName(), u.getId())))
                .orElse(ResponseEntity.notFound().build());
    }
}
