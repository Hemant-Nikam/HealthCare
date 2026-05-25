package com.healthcare.repository;

import com.healthcare.model.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, Long> {
    List<DoctorAvailability> findByDoctorIdOrderByUnavailableDateAsc(Long doctorId);

    List<DoctorAvailability> findByDoctorIdAndUnavailableDate(Long doctorId, LocalDate date);

    List<DoctorAvailability> findByDoctorIdAndUnavailableDateAndUnavailableTimeslot(
            Long doctorId, LocalDate date, String timeslot);

    List<DoctorAvailability> findByDoctorIdAndUnavailableDateGreaterThanEqual(
            Long doctorId, LocalDate date);
}
