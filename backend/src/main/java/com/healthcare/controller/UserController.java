package com.healthcare.controller;

import com.healthcare.model.User;
import com.healthcare.repository.UserRepository;
import com.healthcare.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    public UserController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromToken(authHeader);
        if (user == null) return ResponseEntity.status(403).build();
        
        // Return basic info. Passwords should be omitted (handled by JsonIgnore or DTO, but User entity might not ignore it natively without proper annotations).
        // It's safer to return a Map
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "name", user.getName(),
            "email", user.getEmail(),
            "phone", user.getPhone() != null ? user.getPhone() : "",
            "role", user.getRole(),
            "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> body) {
        User user = getUserFromToken(authHeader);
        if (user == null) return ResponseEntity.status(403).build();

        if (body.containsKey("name")) user.setName(body.get("name"));
        if (body.containsKey("phone")) user.setPhone(body.get("phone"));
        
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    @PostMapping("/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestHeader("Authorization") String authHeader, @RequestParam("file") MultipartFile file) {
        User user = getUserFromToken(authHeader);
        if (user == null) return ResponseEntity.status(403).build();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        try {
            // Ensure directory exists
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // Generate unique filename
            String originalFileName = file.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadDir, fileName);

            // Save file
            Files.write(filePath, file.getBytes());

            // URL to access the file
            String fileUrl = "/uploads/" + fileName;
            user.setProfilePicture(fileUrl);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                "message", "Profile picture uploaded successfully",
                "profilePicture", fileUrl
            ));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload file"));
        }
    }

    private User getUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String email = jwtUtil.extractEmail(authHeader.substring(7));
        return userRepository.findByEmail(email).orElse(null);
    }
}
