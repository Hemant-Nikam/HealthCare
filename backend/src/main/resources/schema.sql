-- ============================================
-- SMART HEALTHCARE PLATFORM - DATABASE SCHEMA
-- ============================================

CREATE DATABASE IF NOT EXISTS healthcare_db;
USE healthcare_db;

-- USERS TABLE
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('PATIENT','DOCTOR','ADMIN') NOT NULL DEFAULT 'PATIENT',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- PATIENT PROFILES
CREATE TABLE patient_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    dob DATE,
    gender ENUM('MALE','FEMALE','OTHER'),
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact VARCHAR(20),
    allergies TEXT,
    chronic_conditions TEXT,
    health_score INT DEFAULT 75,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- DOCTOR PROFILES
CREATE TABLE doctor_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    doctor_type ENUM('ALLOPATHIC','AYURVEDIC','HOMEOPATHIC','UNANI','SIDDHA','NATUROPATHY','DENTIST','PHYSIOTHERAPIST','OTHER') DEFAULT 'ALLOPATHIC',
    degree VARCHAR(255),
    specialization VARCHAR(100),
    hospital_affiliation VARCHAR(200),
    education TEXT,
    experience_years INT,
    consultation_fee DECIMAL(10,2),
    city VARCHAR(100),
    state VARCHAR(100),
    full_address TEXT,
    latitude DOUBLE,
    longitude DOUBLE,
    languages VARCHAR(500),
    license_number VARCHAR(50),
    registration_council VARCHAR(200),
    bio TEXT,
    available_days VARCHAR(100),
    average_rating DOUBLE DEFAULT 0.0,
    total_reviews INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- DOCTOR REVIEWS
CREATE TABLE doctor_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    appointment_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review (doctor_id, patient_id, appointment_id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- APPOINTMENTS
CREATE TABLE appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- PRESCRIPTIONS
CREATE TABLE prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT UNIQUE NOT NULL,
    diagnosis VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- PRESCRIPTION_MEDICINES
CREATE TABLE prescription_medicines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- BILLING
CREATE TABLE billing (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MEDICINE REMINDERS
CREATE TABLE medicine_reminders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    reminder_times VARCHAR(500),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id)
);

-- HEALTH REPORTS
CREATE TABLE health_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    report_type VARCHAR(100),
    report_name VARCHAR(200),
    file_path VARCHAR(500),
    manual_data TEXT,
    ai_analysis TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id)
);

-- HEALTH VITALS (for analytics)
CREATE TABLE health_vitals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    recorded_date DATE NOT NULL,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate INT,
    blood_sugar DECIMAL(6,2),
    weight DECIMAL(5,2),
    temperature DECIMAL(4,1),
    oxygen_saturation INT,
    FOREIGN KEY (patient_id) REFERENCES users(id)
);

-- CHAT HISTORY
CREATE TABLE chat_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    chat_type ENUM('CHATBOT','SYMPTOM_CHECK','REPORT_ANALYSIS') DEFAULT 'CHATBOT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SEED DATA
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@health.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', 'ADMIN'),
('Dr. Sarah Johnson', 'doctor@health.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', 'DOCTOR'),
('John Patient', 'patient@health.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', 'PATIENT');

INSERT INTO doctor_profiles (user_id, specialization, license_number, experience_years, hospital_affiliation, consultation_fee)
VALUES (2, 'General Medicine', 'LIC-2024-001', 10, 'City General Hospital', 500.00);

INSERT INTO patient_profiles (user_id, dob, gender, blood_group, health_score)
VALUES (3, '1990-05-15', 'MALE', 'O+', 78);
