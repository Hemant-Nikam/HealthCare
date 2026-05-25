package com.healthcare.config;

import com.healthcare.model.User;
import com.healthcare.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Admin
        User admin = userRepository.findByEmail("admin@health.com").orElse(new User());
        admin.setName("System Admin");
        admin.setEmail("admin@health.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setPhone("1000000000");
        admin.setRole(User.Role.ADMIN);
        admin.setIsActive(true);
        userRepository.save(admin);

        // Doctor
        // User doctor = userRepository.findByEmail("doctor@health.com").orElse(new User());
        // doctor.setName("Jane Smith");
        // doctor.setEmail("doctor@health.com");
        // doctor.setPassword(passwordEncoder.encode("doctor123"));
        // doctor.setPhone("2000000000");
        // doctor.setRole(User.Role.DOCTOR);
        // doctor.setIsActive(true);
        // userRepository.save(doctor);


        // Patient
        User patient = userRepository.findByEmail("patient@health.com").orElse(new User());
        patient.setName("John Doe");
        patient.setEmail("patient@health.com");
        patient.setPassword(passwordEncoder.encode("patient123"));
        patient.setPhone("3000000000");
        patient.setRole(User.Role.PATIENT);
        patient.setIsActive(true);
        userRepository.save(patient);

        System.out.println("Demo users initialized/updated successfully!");
    }
}
