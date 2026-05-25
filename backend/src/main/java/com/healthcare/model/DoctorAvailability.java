package com.healthcare.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_availability")
public class DoctorAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User doctor;

    @Column(name = "unavailable_date")
    private LocalDate unavailableDate;

    @Column(name = "unavailable_timeslot", length = 20)
    private String unavailableTimeslot;

    @Enumerated(EnumType.STRING)
    @Column(name = "absence_type")
    private AbsenceType absenceType = AbsenceType.FULL_DAY;

    @Column(length = 200)
    private String reason;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum AbsenceType {
        FULL_DAY, TIMESLOT
    }

    public DoctorAvailability() {
    }

    // ----- Getters and Setters -----

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getDoctor() {
        return doctor;
    }

    public void setDoctor(User doctor) {
        this.doctor = doctor;
    }

    public LocalDate getUnavailableDate() {
        return unavailableDate;
    }

    public void setUnavailableDate(LocalDate unavailableDate) {
        this.unavailableDate = unavailableDate;
    }

    public String getUnavailableTimeslot() {
        return unavailableTimeslot;
    }

    public void setUnavailableTimeslot(String unavailableTimeslot) {
        this.unavailableTimeslot = unavailableTimeslot;
    }

    public AbsenceType getAbsenceType() {
        return absenceType;
    }

    public void setAbsenceType(AbsenceType absenceType) {
        this.absenceType = absenceType;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
